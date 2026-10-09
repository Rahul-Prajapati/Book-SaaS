import { notifyAudioListenTimeUpdated } from "@/lib/client/user-profile-events";

const FLUSH_INTERVAL_MS = 15_000;
const MAX_INCREMENT_SECONDS = 30;

export function trackAudioListenTime(audio: HTMLAudioElement): () => void {
  let activeSince: number | null = null;
  let pendingMilliseconds = 0;

  const flush = (continuePlayback = false) => {
    if (activeSince !== null) {
      pendingMilliseconds += performance.now() - activeSince;
      activeSince = continuePlayback ? performance.now() : null;
    }

    while (pendingMilliseconds >= 1000) {
      const seconds = Math.min(
        Math.floor(pendingMilliseconds / 1000),
        MAX_INCREMENT_SECONDS
      );
      pendingMilliseconds -= seconds * 1000;
      void fetch("/api/user/audio-listen-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds }),
        keepalive: true,
      })
        .then((response) => {
          if (response.ok) notifyAudioListenTimeUpdated(seconds);
        })
        .catch(() => {});
    }
  };

  const start = () => {
    if (
      document.visibilityState === "visible" &&
      !audio.paused &&
      !audio.seeking &&
      audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA &&
      activeSince === null
    ) {
      activeSince = performance.now();
    }
  };

  const stop = () => {
    flush();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      stop();
    } else if (
      !audio.paused &&
      !audio.seeking &&
      audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
    ) {
      start();
    }
  };

  const interval = window.setInterval(() => {
    if (activeSince !== null) flush(true);
  }, FLUSH_INTERVAL_MS);

  audio.addEventListener("playing", start);
  audio.addEventListener("pause", stop);
  audio.addEventListener("waiting", stop);
  audio.addEventListener("stalled", stop);
  audio.addEventListener("seeking", stop);
  audio.addEventListener("seeked", start);
  audio.addEventListener("ended", stop);
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", stop);

  start();

  return () => {
    stop();
    window.clearInterval(interval);
    audio.removeEventListener("playing", start);
    audio.removeEventListener("pause", stop);
    audio.removeEventListener("waiting", stop);
    audio.removeEventListener("stalled", stop);
    audio.removeEventListener("seeking", stop);
    audio.removeEventListener("seeked", start);
    audio.removeEventListener("ended", stop);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", stop);
  };
}
