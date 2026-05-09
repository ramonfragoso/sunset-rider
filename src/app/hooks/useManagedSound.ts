"use client";

import { Howl, Howler } from "howler";
import { useEffect, useMemo, useRef } from "react";

type ManagedSoundOptions = {
  src: string | string[];
  enabled: boolean;
  autoplay?: boolean;
  loop?: boolean;
  volume?: number;
  fadeInMs?: number;
  playbackRate?: number;
};

export function useManagedSound({
  src,
  enabled,
  autoplay = true,
  loop = false,
  volume = 1,
  fadeInMs = 0,
  playbackRate = 1,
}: ManagedSoundOptions) {
  const soundRef = useRef<Howl | null>(null);
  const soundIdRef = useRef<number | null>(null);
  const pauseTimeoutRef = useRef<number | null>(null);
  const srcKey = Array.isArray(src) ? src.join("|") : src;
  const srcList = useMemo(() => (Array.isArray(src) ? [...src] : [src]), [src]);

  useEffect(() => {
    const sound = new Howl({
      src: srcList,
      autoplay: false,
      preload: true,
      volume: 0,
    });

    soundRef.current = sound;

    return () => {
      if (pauseTimeoutRef.current !== null) {
        window.clearTimeout(pauseTimeoutRef.current);
      }

      if (soundIdRef.current !== null) {
        sound.stop(soundIdRef.current);
      }

      soundIdRef.current = null;
      soundRef.current = null;
      sound.unload();
    };
  }, [srcKey, srcList]);

  useEffect(() => {
    const sound = soundRef.current;
    const soundId = soundIdRef.current;

    if (!sound || soundId === null) return;

    sound.loop(loop, soundId);
    sound.rate(playbackRate, soundId);
  }, [loop, playbackRate]);

  useEffect(() => {
    const sound = soundRef.current;

    if (!sound || !autoplay) return;

    const clearPauseTimeout = () => {
      if (pauseTimeoutRef.current === null) return;

      window.clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    };

    const startPlayback = () => {
      if (!enabled) return;

      clearPauseTimeout();

      let soundId = soundIdRef.current;

      if (soundId === null) {
        const nextSoundId = sound.play();
        if (typeof nextSoundId !== "number") return;

        soundId = nextSoundId;
        soundIdRef.current = soundId;
        sound.volume(0, soundId);
      } else if (!sound.playing(soundId)) {
        sound.play(soundId);
      }

      sound.loop(loop, soundId);
      sound.rate(playbackRate, soundId);

      const currentVolume = sound.volume(soundId) as number;
      if (fadeInMs > 0) {
        sound.fade(currentVolume, volume, fadeInMs, soundId);
      } else {
        sound.volume(volume, soundId);
      }
    };

    const stopPlayback = () => {
      const soundId = soundIdRef.current;

      if (soundId === null) return;

      clearPauseTimeout();

      const currentVolume = sound.volume(soundId) as number;
      if (fadeInMs > 0 && currentVolume > 0) {
        sound.fade(currentVolume, 0, fadeInMs, soundId);
        pauseTimeoutRef.current = window.setTimeout(() => {
          if (!sound.playing(soundId)) return;
          sound.pause(soundId);
        }, fadeInMs);
        return;
      }

      sound.volume(0, soundId);
      sound.pause(soundId);
    };

    const unlockAudio = () => {
      const resumePromise = Howler.ctx?.resume();
      if (!resumePromise) {
        startPlayback();
        return;
      }

      void resumePromise.then(startPlayback).catch(() => {
        startPlayback();
      });
    };

    if (enabled) {
      startPlayback();
    } else {
      stopPlayback();
    }

    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
  }, [autoplay, enabled, fadeInMs, loop, playbackRate, volume]);
}
