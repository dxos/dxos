//
// Copyright 2026 DXOS.org
//

import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type Chapter } from './types.ts';

export const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4] as const;

/** Back restarts the current chapter while the head is more than this far into it, as a CD player does. */
const RESTART_THRESHOLD = 1.5;

/** Speed and volume outlive a page load; storage may be refused (private window, Artifact preview). */
const stored = {
  get: (key: string, fallback: number): number => {
    try {
      const value = Number(localStorage.getItem(`autocue:${key}`));
      return Number.isFinite(value) && localStorage.getItem(`autocue:${key}`) !== null ? value : fallback;
    } catch {
      return fallback;
    }
  },
  set: (key: string, value: number) => {
    try {
      localStorage.setItem(`autocue:${key}`, String(value));
    } catch {}
  },
};

export type Playback = {
  videoRef: RefObject<HTMLVideoElement | null>;
  time: number;
  duration: number;
  playing: boolean;
  rate: number;
  volume: number;
  muted: boolean;
  /** Index of the chapter under the head, or -1 before the first. */
  chapter: number;
  /** Short status of the last keyboard or button action, shown over the picture. */
  flash?: string;
  toggle: () => void;
  stop: () => void;
  seek: (time: number) => void;
  seekChapter: (index: number) => void;
  stepChapter: (direction: 1 | -1) => void;
  setRate: (rate: number) => void;
  stepRate: (direction: 1 | -1) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  notify: (text: string) => void;
};

/**
 * The state of one `<video>` element and the actions the transport, the timeline and the keyboard share. The element
 * stays the source of truth; React state mirrors it from media events.
 */
export const usePlayback = (chapters: Chapter[], fallbackDuration = 0): Playback => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDuration);
  const [playing, setPlaying] = useState(false);
  const [rate, setRateState] = useState(() => stored.get('rate', 1));
  const [volume, setVolumeState] = useState(() => stored.get('volume', 1));
  const [muted, setMuted] = useState(false);
  const [flash, setFlash] = useState<string>();
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const notify = useCallback((text: string) => {
    setFlash(text);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(undefined), 800);
  }, []);

  useEffect(() => {
    setDuration(fallbackDuration);
  }, [fallbackDuration]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.playbackRate = rate;
    video.defaultPlaybackRate = rate;
    video.volume = volume;
    video.muted = muted;
  }, [rate, volume, muted]);

  // `timeupdate` fires about four times a second; a frame loop keeps the playhead smooth while playing.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    let frame = 0;
    const tick = () => {
      setTime(video.currentTime);
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      setTime(video.currentTime);
      setPlaying(!video.paused && !video.ended);
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
      cancelAnimationFrame(frame);
      if (!video.paused && !video.ended) {
        frame = requestAnimationFrame(tick);
      }
    };
    const loaded = () => {
      video.playbackRate = video.defaultPlaybackRate;
      sync();
    };
    const events = ['play', 'pause', 'ended', 'seeked', 'timeupdate', 'durationchange'];
    events.forEach((event) => video.addEventListener(event, sync));
    video.addEventListener('loadedmetadata', loaded);
    return () => {
      cancelAnimationFrame(frame);
      events.forEach((event) => video.removeEventListener(event, sync));
      video.removeEventListener('loadedmetadata', loaded);
    };
  }, []);

  const chapter = useMemo(() => {
    for (let index = chapters.length - 1; index >= 0; index--) {
      if (time + 0.05 >= chapters[index].at) {
        return index;
      }
    }
    return -1;
  }, [chapters, time]);

  const seek = useCallback(
    (target: number) => {
      const video = videoRef.current;
      if (!video) {
        return;
      }
      video.currentTime = Math.min(Math.max(0, target), Math.max(0, (duration || video.duration || 0) - 0.05));
      setTime(video.currentTime);
    },
    [duration],
  );

  const seekChapter = useCallback(
    (index: number) => {
      const target = chapters[index];
      if (target) {
        seek(target.at);
        notify(`${index + 1}. ${target.title}`);
      }
    },
    [chapters, seek, notify],
  );

  const stepChapter = useCallback(
    (direction: 1 | -1) => {
      if (direction > 0) {
        return chapter + 1 < chapters.length ? seekChapter(chapter + 1) : notify('Last chapter');
      }
      const start = chapters[chapter]?.at ?? 0;
      if (chapter >= 0 && time - start > RESTART_THRESHOLD) {
        return seekChapter(chapter);
      }
      if (chapter > 0) {
        return seekChapter(chapter - 1);
      }
      seek(0);
      notify('Start');
    },
    [chapter, chapters, time, seek, seekChapter, notify],
  );

  const toggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (video.paused || video.ended) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const stop = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
      setTime(0);
    }
    notify('Stopped');
  }, [notify]);

  const setRate = useCallback(
    (value: number) => {
      setRateState(value);
      stored.set('rate', value);
      notify(`${value}×`);
    },
    [notify],
  );

  const stepRate = useCallback(
    (direction: 1 | -1) => {
      const index = RATES.findIndex((value) => value >= rate - 0.001);
      setRate(RATES[Math.min(RATES.length - 1, Math.max(0, (index < 0 ? 2 : index) + direction))]);
    },
    [rate, setRate],
  );

  const setVolume = useCallback(
    (value: number) => {
      const next = Math.min(1, Math.max(0, Math.round(value * 100) / 100));
      setVolumeState(next);
      setMuted(next === 0);
      stored.set('volume', next);
      notify(`Volume ${Math.round(next * 100)}%`);
    },
    [notify],
  );

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      notify(current ? `Volume ${Math.round(volume * 100)}%` : 'Muted');
      return !current;
    });
    if (volume === 0) {
      setVolumeState(0.8);
    }
  }, [volume, notify]);

  return {
    videoRef,
    time,
    duration,
    playing,
    rate,
    volume,
    muted,
    chapter,
    flash,
    toggle,
    stop,
    seek,
    seekChapter,
    stepChapter,
    setRate,
    stepRate,
    setVolume,
    toggleMute,
    notify,
  };
};

/** `m:ss.s`, the clock a step list reads in. */
export const formatClock = (seconds: number | undefined): string => {
  const value = Math.max(0, seconds ?? 0);
  const minutes = Math.floor(value / 60);
  return `${minutes}:${(value - minutes * 60).toFixed(1).padStart(4, '0')}`;
};
