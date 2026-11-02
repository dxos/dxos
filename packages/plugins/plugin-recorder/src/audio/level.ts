//
// Copyright 2026 DXOS.org
//

/** Bottom of the meter scale (dBFS). */
export const FLOOR_DB = -60;

/** Where speech peaks should sit (dBFS). */
export const TARGET_DB = { min: -12, max: -3 } as const;

/** A peak above this is flagged as clipping (dBFS). */
export const CLIP_DB = -1;

/** How long the peak-hold marker stays before falling to the current peak (ms). */
export const PEAK_HOLD_MS = 1500;

/** Digital silence this long means a muted or dead input (ms). */
export const SILENCE_MS = 2000;

/** A muted mic delivers exact zeros; anything above this is signal. */
const SIGNAL_AMPLITUDE = 1e-5;

/** Amplitude (0..1) in dBFS, with silence pinned below the floor rather than at -Infinity. */
export const toDb = (amplitude: number): number => 20 * Math.log10(amplitude || 1e-6);

/** A level as a fraction (0..1) of the meter's width. */
export const toFraction = (db: number): number => Math.max(0, Math.min(1, (db - FLOOR_DB) / -FLOOR_DB));

export type MeterState = {
  /** Peak of the latest block (dBFS). */
  peakDb: number;
  /** RMS level of the latest block (dBFS). */
  rmsDb: number;
  /** Highest recent peak (dBFS), held for {@link PEAK_HOLD_MS}. */
  holdDb: number;
  holdAt: number;
  lastSignalAt: number;
  /** No signal for {@link SILENCE_MS}. */
  silent: boolean;
  /** The held peak is above {@link CLIP_DB}. */
  clip: boolean;
};

export const initialMeterState = (now: number): MeterState => ({
  peakDb: FLOOR_DB,
  rmsDb: FLOOR_DB,
  holdDb: FLOOR_DB,
  holdAt: now,
  lastSignalAt: now,
  silent: false,
  clip: false,
});

/** Folds one block of time-domain samples (-1..1) into the meter state at time `now` (ms). */
export const nextMeterState = (state: MeterState, samples: ArrayLike<number>, now: number): MeterState => {
  let peak = 0;
  let sum = 0;
  for (let index = 0; index < samples.length; index++) {
    const sample = samples[index];
    peak = Math.max(peak, Math.abs(sample));
    sum += sample * sample;
  }

  const peakDb = toDb(peak);
  const rmsDb = toDb(samples.length > 0 ? Math.sqrt(sum / samples.length) : 0);
  const hold = peakDb >= state.holdDb || now - state.holdAt > PEAK_HOLD_MS;
  const holdDb = hold ? peakDb : state.holdDb;
  const lastSignalAt = peak > SIGNAL_AMPLITUDE ? now : state.lastSignalAt;
  return {
    peakDb,
    rmsDb,
    holdDb,
    holdAt: hold ? now : state.holdAt,
    lastSignalAt,
    silent: now - lastSignalAt > SILENCE_MS,
    clip: holdDb > CLIP_DB,
  };
};
