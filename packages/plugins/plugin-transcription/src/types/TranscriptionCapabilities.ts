//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';
import { type EntityLookup as EntityLookupFn } from '@dxos/pipeline-transcription';

import { meta } from '#meta';

import * as SettingsModule from './Settings';

export const Settings = Capability.make<Atom.Writable<SettingsModule.Settings>>(
  `${meta.profile.key}.capability.settings`,
);

/**
 * Control surface for a feed written by an active meeting call (native RealtimeKit segments, via
 * `CallManager`): the current on/off state plus a toggle that switches the meeting-wide transcription.
 */
export type ManagedFeedControl = {
  /** Whether native transcription is currently running for this feed. */
  enabled: boolean;
  /** Toggles the meeting's native transcription (broadcast to all participants). */
  toggle: () => void;
};

/**
 * Feeds currently bound to an active meeting call (native RealtimeKit segments, via `CallManager`),
 * keyed by feed URI. Registered by the meeting wiring while joined. The UI uses this to suppress its
 * own local recorder for these transcripts (meetings transcribe via the call, not a second per-client
 * capture) and to drive its toolbar toggle off the meeting-wide state instead.
 */
export const ManagedFeeds = Capability.make<Atom.Writable<ReadonlyMap<string, ManagedFeedControl>>>(
  `${meta.profile.key}.capability.managed-feeds`,
);

/**
 * The single active editor transcription session. `id` is the editor's attendable id (the key it
 * registered under in `MarkdownCapabilities.EditorViews`); `recording` gates audio capture. `null`
 * when no session is active.
 */
export type RecordingSession = { id: string; recording: boolean };

export const RecordingSession = Capability.make<Atom.Writable<RecordingSession | null>>(
  `${meta.profile.key}.capability.recording-session`,
);

/**
 * Resolves entity references for live-transcription enrichment. Backend-agnostic (full-text, vector,
 * a remote service, …) so the headless driver depends on the function, not the database.
 */
export type EntityLookup = EntityLookupFn;

export const EntityLookup = Capability.make<EntityLookupFn>(`${meta.profile.key}.capability.entity-lookup`);

/**
 * Live transcription lifecycle, published by the driver for observers (toolbar spinner, testbench):
 * `recording` (mic capturing) → `draining` (mic off, finishing the pipeline) → `idle`.
 */
export type PipelinePhase = 'idle' | 'recording' | 'draining';

export const PipelineStatus = Capability.make<Atom.Writable<{ phase: PipelinePhase }>>(
  `${meta.profile.key}.capability.pipeline-status`,
);
