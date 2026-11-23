//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import { type Database } from '@dxos/echo';
import type * as Meeting from '@dxos/plugin-meeting/Meeting';

import { MeetingRecorderNamespace } from '../namespace.ts';
import type * as SettingsModule from './Settings.ts';

/** An app holding the microphone, as the native side reports it. */
export type MicApp = {
  /** Bundle id (`us.zoom.xos`), or `pid:<n>` when the OS reports none. */
  id: string;
  name: string;
};

export type DetectionEvent = { type: 'micStarted'; apps: MicApp[] } | { type: 'micStopped'; apps: MicApp[] };

export type Support = {
  /** Other apps' microphone use can be observed. */
  detection: boolean;
  /** The system audio output (the far side of a call) can be captured. */
  systemAudio: boolean;
};

/**
 * The host's capture surface: Tauri's `meeting-capture` plugin on desktop, a microphone-only stub in
 * a browser.
 */
export interface CaptureBridge {
  getSupport(): Promise<Support>;
  listMicApps(): Promise<MicApp[]>;
  startDetection(onEvent: (event: DetectionEvent) => void): Promise<void>;
  stopDetection(): Promise<void>;
  /** Starts system-audio capture; `onSamples` receives mono `f32` PCM at the returned sample rate. */
  startSystemAudio(onSamples: (samples: Float32Array) => void): Promise<{ sampleRate: number }>;
  stopSystemAudio(): Promise<void>;
}

export const Bridge = Capability.makeSingleton<CaptureBridge>()(`${MeetingRecorderNamespace.key}.capability.bridge`);

export type RecorderState =
  | { phase: 'idle' }
  /** A meeting app took the microphone and the user has not answered the prompt yet. */
  | { phase: 'detected'; app: MicApp }
  | {
      phase: 'starting';
      app?: MicApp;
      /** The app released the microphone before capture was up; stop as soon as it is. */
      stopRequested?: boolean;
    }
  | {
      phase: 'recording';
      meeting: Meeting.Meeting;
      app?: MicApp;
      /** Epoch ms. */
      startedAt: number;
      /** Whether the other participants (system audio) are being transcribed too. */
      systemAudio: boolean;
    }
  | { phase: 'stopping'; meeting: Meeting.Meeting };

export const State = Capability.makeSingleton<Atom.Writable<RecorderState>>()(
  `${MeetingRecorderNamespace.key}.capability.state`,
);

export const Settings = Capability.makeSingleton<Atom.Writable<SettingsModule.Settings>>()(
  `${MeetingRecorderNamespace.key}.capability.settings`,
);

/** Owns the live audio pipeline of the current recording; the operations drive it. */
export interface Recorder {
  /** Starts transcribing into `meeting`; resolves with whether the other participants are captured too. */
  start(options: { db: Database.Database; meeting: Meeting.Meeting; app?: MicApp }): Promise<{ systemAudio: boolean }>;
  /** Stops capture after the buffered audio has been transcribed. */
  stop(): Promise<void>;
}

export const Recorder = Capability.makeSingleton<Recorder>()(`${MeetingRecorderNamespace.key}.capability.recorder`);
