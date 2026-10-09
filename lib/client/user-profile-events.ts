export const USER_AUDIO_LISTEN_TIME_EVENT = "user-profile:audio-listen-time";

export function notifyAudioListenTimeUpdated(seconds: number) {
  window.dispatchEvent(
    new CustomEvent(USER_AUDIO_LISTEN_TIME_EVENT, { detail: { seconds } })
  );
}
