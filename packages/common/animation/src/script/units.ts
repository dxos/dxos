//
// Copyright 2026 DXOS.org
//

const DURATION = /^(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?(?:(\d+(?:\.\d+)?)ms)?$/;
const RATE = /^(\d+(?:\.\d+)?)\s*\/\s*(s|m)$/;

/** Milliseconds from "2s", "200ms", "1m20s" or a number of seconds; undefined if malformed. */
export const parseDuration = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return value >= 0 ? value * 1000 : undefined;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }
  const match = DURATION.exec(value.trim());
  if (!match) {
    return undefined;
  }
  const [, minutes = '0', seconds = '0', millis = '0'] = match;
  return Number(minutes) * 60_000 + Number(seconds) * 1000 + Number(millis);
};

/** Events per second from "4/s", "30/m" or a number; undefined unless positive. */
export const parseRate = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return value > 0 ? value : undefined;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const match = RATE.exec(value.trim());
  if (!match) {
    return undefined;
  }
  const [, count = '0', unit] = match;
  const rate = Number(count) / (unit === 'm' ? 60 : 1);
  return rate > 0 ? rate : undefined;
};

/** "m:ss". */
export const formatDuration = (ms: number): string =>
  `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
