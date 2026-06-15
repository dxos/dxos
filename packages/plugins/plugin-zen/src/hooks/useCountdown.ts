//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useRef, useState } from 'react';

const formatTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
};

export type UseCountdownResult = {
  /** Remaining seconds. */
  remaining: number;
  /** Formatted time string (mm:ss or hh:mm:ss). */
  formattedTime: string;
  /** Start the countdown from the configured duration. */
  start: () => void;
  /** Stop the countdown and reset. */
  stop: () => void;
};

/** Countdown timer that ticks every second from the given duration (in seconds) down to zero. */
export const useCountdown = (durationSeconds: number): UseCountdownResult => {
  const [remaining, setRemaining] = useState(durationSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const activeRef = useRef(false);

  // Update remaining when duration changes while not active.
  useEffect(() => {
    if (!activeRef.current) {
      setRemaining(durationSeconds);
    }
  }, [durationSeconds]);

  const stop = useCallback(() => {
    if (intervalRef.current !== undefined) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    activeRef.current = false;
    setRemaining(durationSeconds);
  }, [durationSeconds]);

  const start = useCallback(() => {
    stop();
    activeRef.current = true;
    setRemaining(durationSeconds);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = undefined;
          activeRef.current = false;
          return 0;
        }
        return prev - 1;
      });
    }, 1_000);
  }, [durationSeconds, stop]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (intervalRef.current !== undefined) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { remaining, formattedTime: formatTime(remaining), start, stop };
};
