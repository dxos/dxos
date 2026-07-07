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
 * Feed URIs currently written by an active meeting call (native RealtimeKit segments, via `CallManager`).
 * Registered by the meeting wiring while joined. The UI uses this to suppress its own local recorder for
 * these transcripts, so meetings transcribe only via the call rather than a second, per-client capture.
 */
export const ManagedFeeds = Capability.make<Atom.Writable<ReadonlySet<string>>>(
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
