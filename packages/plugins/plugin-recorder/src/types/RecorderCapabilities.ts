//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import type * as Presentation from '@dxos/plugin-presenter/Presentation';

import { RecorderNamespace } from '../namespace.ts';
import type * as RecorderSettings from './RecorderSettings.ts';
import type * as Take from './Take.ts';

/** The recorder's settings (microphone, video source). */
export const Settings = Capability.makeSingleton<Atom.Writable<RecorderSettings.Settings>>()(
  `${RecorderNamespace.key}.capability.settings`,
);

/** A take that could not be saved, held in memory so it is not lost. */
export type PendingTake = {
  id: string;
  name: string;
  slideId: string;
  data: Blob;
  log: Take.Log;
  error: string;
};

export type RecorderState = {
  /** `counting` is the 3-2-1 count-in, with the inputs open and nothing recorded yet. */
  status: 'idle' | 'starting' | 'counting' | 'recording';
  /** Seconds left in the count-in. */
  count?: number;
  /** The presentation being recorded, and the one slide when only it is. */
  presentationId?: string;
  slideId?: string;
  /** `performance.now()` when recording began, after the count-in. */
  startedAt?: number;
  source?: Take.VideoSource;
  /** The slide being recorded: when its take began (`performance.now()`) and its desired length (seconds). */
  slide?: { id: string; startedAt: number; duration?: number };
  /** Why the last recording failed to start. */
  error?: string;
  pending: readonly PendingTake[];
};

/** What to record: every slide shown, or `slide` alone (the recording ends when the reader leaves it). */
export type RecordScope = {
  presentation: Presentation.Presentation;
  slide?: Presentation.Slide;
};

/** The slide on screen, as the presenter reports it. */
export type SlideMark = { slide?: Presentation.Slide; id: string; step: number };

/**
 * Records a presentation's voice-over, split by slide: each slide read becomes a take of that slide. A service,
 * since the toolbar that starts a recording unmounts while the deck is presented.
 */
export interface Recorder {
  readonly state: Atom.Atom<RecorderState>;
  /** The live input, for a level meter, while recording. */
  readonly analyser: AnalyserNode | undefined;
  /**
   * Opens the inputs, then counts in 3-2-1 and records; call it from the click that starts it (Chrome gates media
   * and audio on it). Resolves false when the inputs could not open (the reason is in `state.error`).
   */
  start(scope: RecordScope): Promise<boolean>;
  /** The slide on screen changed. */
  mark(mark: SlideMark): void;
  /** Ends the recording and saves its last take. */
  stop(): void;
  /** Saves a pending take again. */
  retry(id: string): Promise<void>;
  /** Downloads a pending take as a file. */
  download(id: string): void;
  discard(id: string): void;
}

export const Recorder = Capability.makeSingleton<Recorder>()(`${RecorderNamespace.key}.capability.recorder`);
