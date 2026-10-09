"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { USER_AUDIO_LISTEN_TIME_EVENT } from "@/lib/client/user-profile-events";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  audioListenTime: number;
  createdAt: string;
}

interface UserProfileContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  refresh: (options?: { silent?: boolean }) => Promise<UserProfile | null>;
  ensureLoaded: () => void;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const currentUser = useRef<UserProfile | null>(null);
  const hasLoaded = useRef(false);
  const inFlightRequest = useRef<Promise<UserProfile | null> | null>(null);

  const refresh = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (inFlightRequest.current) return inFlightRequest.current;

    const request = (async () => {
      try {
        const response = await fetch("/api/user/profile", {
          cache: "no-store",
        });
        if (response.status === 401 || response.status === 404) {
          currentUser.current = null;
          setUser(null);
          return null;
        }
        if (!response.ok) return currentUser.current;

        const profile = (await response.json()) as UserProfile;
        currentUser.current = profile;
        setUser(profile);
        return profile;
      } catch (error) {
        console.error("Failed to fetch user profile", error);
        return currentUser.current;
      } finally {
        hasLoaded.current = true;
        inFlightRequest.current = null;
        setIsLoading(false);
      }
    })();

    inFlightRequest.current = request;
    if (!silent) setIsLoading(true);
    return request;
  }, []);

  const ensureLoaded = useCallback(() => {
    if (!hasLoaded.current) void refresh();
  }, [refresh]);

  useEffect(() => {
    const handleFocus = () => {
      if (hasLoaded.current && user) void refresh({ silent: true });
    };
    const handleAudioListenTimeUpdate = (event: Event) => {
      const seconds = (event as CustomEvent<{ seconds: number }>).detail.seconds;
      if (!Number.isInteger(seconds) || seconds < 1) return;

      const currentProfile = currentUser.current;
      if (!currentProfile) return;
      const updatedProfile = {
        ...currentProfile,
        audioListenTime: currentProfile.audioListenTime + seconds,
      };
      currentUser.current = updatedProfile;
      setUser(updatedProfile);
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener(USER_AUDIO_LISTEN_TIME_EVENT, handleAudioListenTimeUpdate);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(USER_AUDIO_LISTEN_TIME_EVENT, handleAudioListenTimeUpdate);
    };
  }, [refresh, user]);

  return (
    <UserProfileContext.Provider value={{ user, isLoading, refresh, ensureLoaded }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile(options: { loadOnMount?: boolean } = {}) {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error("useUserProfile must be used within UserProfileProvider");
  }

  useEffect(() => {
    if (options.loadOnMount !== false) context.ensureLoaded();
  }, [context.ensureLoaded, options.loadOnMount]);

  return {
    user: context.user,
    isLoading: context.isLoading,
    refresh: context.refresh,
  };
}
