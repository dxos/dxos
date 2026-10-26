//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import type * as Presentation from '@dxos/plugin-presenter/Presentation';

import { meta } from '#meta';

import type * as RecorderSettings from './RecorderSettings.ts';
import type * as Take from './Take.ts';

/** The recorder's settings (microphone, video source). */
export const Settings = Capability.makeSingleton<Atom.Writable<RecorderSettings.Settings>>()(
  `${meta.profile.key}.capability.settings`,
);

/** A take that could not be saved, held in memory so it is not lost. */
export type PendingTake = {
  id: string;
  name: string;
  presentationId: string;
  data: Blob;
  log: Take.Log;
  error: string;
};

export type RecorderState = {
  status: 'idle' | 'starting' | 'recording' | 'saving';
  /** The presentation being recorded. */
  presentationId?: string;
  /** `performance.now()` when the take started. */
  startedAt?: number;
  source?: Take.VideoSource;
  /** The slide on screen while recording: when it came on (`performance.now()`) and its desired length (seconds). */
  slide?: { id: string; startedAt: number; duration?: number };
  /** Why the last take failed to start. */
  error?: string;
  pending: readonly PendingTake[];
};

/** Records takes of a presentation; a service, since the toolbar that starts a take unmounts while it is presented. */
export interface Recorder {
  readonly state: Atom.Atom<RecorderState>;
  /** The live input, for a level meter, while recording. */
  readonly analyser: AnalyserNode | undefined;
  /**
   * Acquires the inputs and starts a take; call it from the click that starts it (Chrome gates media and audio on it).
   * Resolves false when the take could not start (the reason is in `state.error`).
   */
  start(presentation: Presentation.Presentation): Promise<boolean>;
  /** The slide on screen changed. */
  mark(slide: { id: string; title?: string; step: number; duration?: number }): void;
  /** Ends the take and saves it. */
  stop(): void;
  /** Saves a pending take again. */
  retry(id: string): Promise<void>;
  /** Downloads a pending take as a file. */
  download(id: string): void;
  discard(id: string): void;
}

export const Recorder = Capability.makeSingleton<Recorder>()(`${meta.profile.key}.capability.recorder`);
