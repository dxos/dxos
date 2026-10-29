//
// Copyright 2025 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppActivationEvents from '@dxos/app-toolkit/AppActivationEvents';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import { trim } from '@dxos/util';

import { TranscriptionNamespace } from './src/namespace.ts';
import * as TranscriptionCapabilities from './src/types/TranscriptionCapabilities.ts';
import * as TranscriptionEvents from './src/types/TranscriptionEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: TranscriptionNamespace.key,
    name: 'Transcription',
    author: 'DXOS',
    description: trim`
      Real-time voice-to-text transcription for DXOS Composer.
      Captures microphone audio in short PCM chunks, batches them into WAV payloads, and streams
      the results to a Whisper-compatible speech-recognition endpoint.
      Transcribed segments are timestamped, deduplicated across chunk boundaries, and persisted
      as Message objects in an ECHO Feed so that every participant in a shared space sees the
      live transcript without any manual sync step.

      Each recording session is represented as a Transcript object linked to its Feed.
      The read-only editor renders messages with speaker bylines and wall-clock timestamps,
      supporting markdown decoration and document preview.
      An optional message enricher pipeline lets plugins annotate messages before they are
      committed — for example, to attach speaker identity from a calls service.

      The plugin ships two skill-compatible operations: Open (loads and formats a transcript
      for reading by an AI assistant) and Summarize (sends the transcript text to an LLM and
      returns a structured Markdown summary with key points, verbatim quotes, and actionable
      tasks extracted from the conversation).

      A sentence-normalization pass merges raw word-level tokens from the recognizer into
      grammatically complete sentences, improving readability of the stored transcript without
      altering the underlying audio timeline.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-transcription',
    icon: { key: 'ph--microphone--regular', hue: 'sky' },
    spec: 'PLUGIN.mdl',
    tags: ['alpha'],
    screenshots: [],
  },
  modules: [
    // RecordingSession / PipelineStatus / TranscriptionSettings stay eager with the driver
    // (ReactContext): its components read them via strict useAtomCapability hooks, so deferring
    // any of them while the driver mounts trips the missing-capability invariant.
    // Exception to the headless `appGraphBuilder` default: this builder's node renders a `<Mic/>`
    // companion inline, so its module is genuinely browser-bound.
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.tsx', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'tauri'],
      },
    ),
    Capability.lazyModule(
      'EntityLookup',
      { activatesOn: TranscriptionEvents.Start, provides: [TranscriptionCapabilities.EntityLookup] },
      () => import('./src/capabilities/entity-lookup.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'MarkdownExtension',
      { activatesOn: MarkdownEvents.Start, provides: [MarkdownCapabilities.ExtensionProvider] },
      () => import('./src/capabilities/markdown-extension.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    Capability.lazyModule(
      'PipelineStatus',
      { provides: [TranscriptionCapabilities.PipelineStatus] },
      () => import('./src/capabilities/pipeline-status.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: TranscriptionNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.Article, AppRole.Section],
    }),
    Capability.lazyModule(
      'RecordingSession',
      { provides: [TranscriptionCapabilities.RecordingSession] },
      () => import('./src/capabilities/recording-session.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    AppCapability.textContent(() => import('./src/capabilities/text-content.ts', { with: { type: 'module-url' } }), {
      activatesOn: TranscriptionEvents.Start,
      environments: ['browser', 'node', 'tauri'],
    }),
    // The fragment targets dictatable types (markdown documents and chats), so it is only useful once either has started.
    Capability.lazyModule(
      'TourFragment',
      {
        provides: [AppCapabilities.TourFragment],
        activatesOn: ActivationEvent.oneOf(MarkdownEvents.Start, AppActivationEvents.AssistantStart),
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/tour-fragment.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'Transcriber',
      {
        activatesOn: TranscriptionEvents.Start,
        requires: [Capabilities.AtomRegistry],
        provides: [TranscriptionCapabilities.TranscriptionManagerProvider],
      },
      () => import('./src/capabilities/transcriber.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.reactContext(
      () => import('./src/capabilities/transcription-driver.tsx', { with: { type: 'module-url' } }),
    ),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      provides: [TranscriptionCapabilities.Settings],
    }),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
