//
// Copyright 2026 DXOS.org
//

import { color, number } from '../params.ts';

/** The passive wave several visualizations share. */
export type WaveConfig = {
  /** Scales the passive wave; 0 stills it. */
  waveAmplitude: number;
  /** A fine, fast tremble over the passive wave; 0 is smooth. */
  jitter: number;
  /** Pace of the passive wave; 0 freezes it in place. */
  waveSpeed: number;
};

export const waveParams = {
  waveAmplitude: number(0, 4, 0.1, 'Wave amplitude'),
  jitter: number(0, 4, 0.1, 'Jitter'),
  waveSpeed: number(0, 5, 0.1, 'Wave speed'),
} as const;

export const waveDefaults: WaveConfig = { waveAmplitude: 1, jitter: 0, waveSpeed: 1 };

/** A solid shape that glows from one colour toward another as the voice gets louder. */
export type GlowConfig = {
  color: string;
  speakingColor: string;
};

export const glowParams = { color: color('Colour'), speakingColor: color('Speaking colour') } as const;

export const glowDefaults: GlowConfig = { color: '#5b8cff', speakingColor: '#2ecc71' };

/** Ink on paper, drawn with strands that shed blots while speaking. */
export type InkConfig = WaveConfig & {
  /** Blots a fully loud band sheds per second. */
  particles: number;
  /** Overlapping strands, each on its own offset and wave phase. */
  strands: number;
  /** Distance between neighbouring strands. */
  separation: number;
  /** How much the strands thicken while speaking; 0 keeps their passive width. */
  thickness: number;
  paper: string;
  ink: string;
};

export const inkParams = {
  ...waveParams,
  particles: number(0, 60, 1, 'Particles'),
  strands: number(1, 8, 1, 'Strands'),
  separation: number(0, 0.2, 0.005, 'Separation'),
  thickness: number(0, 3, 0.1, 'Thickness'),
  paper: color('Paper'),
  ink: color('Ink'),
} as const;

export const inkDefaults: InkConfig = {
  ...waveDefaults,
  particles: 6,
  strands: 1,
  separation: 0.03,
  thickness: 1,
  paper: '#e9e7e2',
  ink: '#151515',
};

/** Combinations found by hand in the stories; every ink visualization offers them. */
export const inkPresets = {
  /** Still strands that shake hard and shed dense ink while speaking. */
  heptapod: {
    waveAmplitude: 0,
    jitter: 3.6,
    waveSpeed: 5,
    particles: 55,
    strands: 7,
    separation: 0.04,
    thickness: 2.2,
  },
  /** Frozen strands, like an etched ring, that tremble and spatter only while speaking. */
  etching: {
    waveAmplitude: 0.3,
    jitter: 3.1,
    waveSpeed: 0,
    particles: 49,
    strands: 5,
    separation: 0.04,
    thickness: 1.5,
  },
  /** Eight strands packed into one fibrous brush stroke that swells while speaking. */
  brush: {
    waveAmplitude: 0.3,
    jitter: 0.3,
    waveSpeed: 3.3,
    particles: 7,
    strands: 8,
    separation: 0.005,
    thickness: 2.3,
  },
  /** Five widely spaced strands drifting slowly, like orbits, that thicken while speaking. */
  orbits: {
    waveAmplitude: 0.2,
    jitter: 1,
    waveSpeed: 0.7,
    particles: 14,
    strands: 5,
    separation: 0.06,
    thickness: 1.9,
  },
  /** Six tight, trembling strands with no blots, like a hand-scribbled ring. */
  scribble: {
    waveAmplitude: 1.4,
    jitter: 3.6,
    waveSpeed: 0.4,
    particles: 0,
    strands: 6,
    separation: 0.02,
    thickness: 1.2,
  },
  /** The scribble in cream ink on mid-navy, as the agent standing in on a call. */
  navy: {
    waveAmplitude: 1.4,
    jitter: 3.6,
    waveSpeed: 0.4,
    particles: 0,
    strands: 6,
    separation: 0.02,
    thickness: 1.2,
    paper: '#26406b',
    ink: '#f1ede4',
  },
} satisfies Record<string, Partial<InkConfig>>;

export const MAX_STRANDS = 8;
/** Enough blots for a high emission rate; a spawn past the pool reuses the oldest. */
export const INK_BLOTS = 240;

/** How far into an idle passive state the voice is: 1 silent, 0 once speech is a quarter of full loudness. */
export const idleness = (level: number) => Math.max(0, 1 - level * 4);
