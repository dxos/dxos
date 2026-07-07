//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';
import { type Space } from '@dxos/client/echo';
import { type Feed } from '@dxos/echo';
import { type EntityLookup as EntityLookupFn } from '@dxos/pipeline-transcription';
import { type ContentBlock, type Message } from '@dxos/types';

import { meta } from '#meta';

import * as SettingsModule from './Settings';

/**
 * Enriches a transcript message before it is written to the feed (e.g. entity linking).
 */
export type TranscriptMessageEnricher = (message: Message.Message) => Promise<Message.Message>;

/**
 * Service contract for the meeting transcription manager. Consumers (e.g. plugin-meeting) depend on
 * this interface via the {@link TranscriptionManagerProvider} capability, not on the concrete
 * implementation, keeping the manager's browser/SDK dependencies out of consumer packages.
 */
export interface TranscriptionManager {
  readonly enabled: Atom.Atom<boolean>;
  setFeed(space: Space, feed: Feed.Feed): void;
  setEnabled(enabled: boolean): Promise<void>;
  /**
   * Append transcript segments (e.g. RealtimeKit native transcription) to the bound feed, enriching them
   * first when a message enricher is configured. No-op unless enabled and a feed is set. This is the only
   * way segments enter the manager — it is a feed writer/sink, not an audio-capturing recorder.
   */
  addTranscript(segments: ContentBlock.Transcript[]): Promise<void>;
  open(): Promise<this>;
  close(): Promise<this>;
}

export type TranscriptionManagerProviderProps = {
  messageEnricher?: TranscriptMessageEnricher;
};

export type TranscriptionManagerProvider = (props: TranscriptionManagerProviderProps) => TranscriptionManager;

export const TranscriptionManagerProvider = Capability.make<TranscriptionManagerProvider>(
  `${meta.profile.key}.capability.transcription-manager`,
);

export const Settings = Capability.make<Atom.Writable<SettingsModule.Settings>>(
  `${meta.profile.key}.capability.settings`,
);

/**
 * Feed URIs currently written by an open {@link TranscriptionManager} (i.e. a joined meeting). The UI
 * uses this to suppress its own local recorder for these transcripts, so meetings transcribe only via the
 * manager (native segments) rather than a second, per-client local capture.
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
