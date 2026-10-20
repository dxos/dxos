//
// Copyright 2026 DXOS.org
//

/** Log-spaced voice bands, as hearing is. */
export const BANDS = 16;
export const LOWEST_HZ = 80;
export const HIGHEST_HZ = 8_000;

/** Linearly spaced voice points, for visualizations that lay frequency out evenly. */
export const LINEAR_POINTS = 64;
export const LINEAR_HIGHEST_HZ = 5_000;

/**
 * Everything a visualization may react to, grouped by how fast it changes. Values are normalised (0..1 unless noted)
 * so visualizations never see device units.
 */
export type AgentSignals = {
  /** Per frame: the agent's own voice. */
  voice: {
    level: number;
    /** 90–500 Hz. */
    low: number;
    /** 2–8 kHz: sibilants. */
    high: number;
    /** `BANDS` log-spaced bands, `LOWEST_HZ` to `HIGHEST_HZ`. */
    bands: number[];
    /** `LINEAR_POINTS` linear points, `LOWEST_HZ` to `LINEAR_HIGHEST_HZ`. */
    linear: number[];
  };
  /** Seconds: what the agent is doing. */
  state: {
    phase: 'idle' | 'listening' | 'thinking' | 'ready' | 'speaking' | 'acting';
    /** Someone named or addressed the agent. */
    addressed: boolean;
  };
  /** Per turn: the conversation around the agent. */
  room: {
    /** Others speaking now. */
    speaking: number;
    /** Overall activity, overlap included. */
    energy: number;
    /** Seconds of silence so far. */
    gap: number;
  };
  /** Per utterance: what is being said. */
  meaning: {
    /** A stable shape seed for the current topic, so one topic always draws one glyph. */
    topic?: { id: string; seed: number[] };
    /** -1 (negative) to 1 (positive). */
    tone?: number;
  };
};

/** A discrete moment beside the snapshot. */
export type SignalEvent =
  | { type: 'onset'; at: number }
  | { type: 'topic'; at: number; id: string }
  | { type: 'note'; at: number; text: string }
  | { type: 'addressed'; at: number };

/** How a provider writes: a slice of the snapshot, or an event. */
export type SignalSink = {
  set<K extends keyof AgentSignals>(slice: K, value: Partial<AgentSignals[K]>): void;
  emit(event: SignalEvent): void;
};

/** The time a frame is rendered at. */
export type FrameTime = {
  /** Seconds since the visualization started. */
  time: number;
  /** Seconds since the previous frame, capped so a stalled tab does not jump. */
  delta: number;
};

/**
 * A source of signals. `start` begins writing to the sink and returns its stop. A provider whose source must be
 * polled (an analyser) samples once per frame, before the visualization reads the snapshot.
 */
export type SignalProvider = {
  readonly id: string;
  start(sink: SignalSink): () => void;
  sample?(time: FrameTime): void;
};

export const emptySignals = (): AgentSignals => ({
  voice: {
    level: 0,
    low: 0,
    high: 0,
    bands: new Array(BANDS).fill(0),
    linear: new Array(LINEAR_POINTS).fill(0),
  },
  state: { phase: 'idle', addressed: false },
  room: { speaking: 0, energy: 0, gap: 0 },
  meaning: {},
});

/**
 * The latest snapshot and the events since the last frame. Providers push; the frame loop pulls once per frame, so
 * voice data at frame rate never goes through React or atoms.
 */
export class SignalBus implements SignalSink {
  readonly #signals = emptySignals();
  #events: SignalEvent[] = [];

  set<K extends keyof AgentSignals>(slice: K, value: Partial<AgentSignals[K]>): void {
    Object.assign(this.#signals[slice], value);
  }

  emit(event: SignalEvent): void {
    this.#events.push(event);
  }

  read(): AgentSignals {
    return this.#signals;
  }

  /** The events since the previous call. */
  drain(): SignalEvent[] {
    const events = this.#events;
    this.#events = [];
    return events;
  }
}
