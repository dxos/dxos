//
// Copyright 2026 DXOS.org
//

// Shared story helpers: the in-memory message model, the recording-session reader, index enabling,
// and the two plugin-manager decorator stacks (plain + markdown-backed).

import { type Decorator } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import { useCallback, useState } from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useAtomCapabilityState } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppCapabilities, AppNode, AppPlugin, AppSpace } from '@dxos/app-toolkit';
import { type Client } from '@dxos/client';
import { Filter } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { Markdown, MarkdownEvents } from '@dxos/plugin-markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { IndexKind } from '@dxos/react-client/echo';
import { renderByline, useFeedModelAdapter } from '@dxos/react-ui-transcription';
import { withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Message, Organization, Person } from '@dxos/types';
import { seedTestData } from '@dxos/types/testing';
import { isNonNullable, trim } from '@dxos/util';

import { TestItem } from '#testing';
import { TranscriptionCapabilities } from '#types';

import { TranscriptionPlugin } from '../../TranscriptionPlugin';

export const SAMPLE_CONTENT = trim`
  # Transcription

  Place the cursor here, then click the microphone in the toolbar to start recording.

  Live transcription appears inline as greyed text — confirm (✓) to insert it into the document, or cancel (✕) to discard.

`;

//
// Message model.
//

/**
 * In-memory message buffer + model adapter for storybook use (production wires up a real
 * space-backed `Feed`). Returns the renderable `model` plus an `appendMessage` callback.
 */
export const useStoryMessageModel = () => {
  const [messages, setMessages] = useState<Message.Message[]>([]);
  const appendMessage = useCallback((message: Message.Message) => setMessages((prev) => [...prev, message]), []);
  const model = useFeedModelAdapter(renderByline([]), messages);
  return { model, appendMessage };
};

/**
 * Reads the shared {@link TranscriptionCapabilities.RecordingSession} for the given id — the real
 * recording flag toggled by the `Mic` button. Non-editor stories observe this to drive their own
 * capture (the editor driver stays idle when no editor view is registered for the session).
 */
export const useRecordingSession = (docId: string): boolean => {
  const [session] = useAtomCapabilityState(TranscriptionCapabilities.RecordingSession);
  return !!session?.recording && session.id === docId;
};

// TODO(mykola): Make API easier to use.
// TODO(mykola): Delete after enabling vector indexing by default.
export const enableQueryIndexes = (services: { QueryService?: any }) =>
  Effect.gen(function* () {
    yield* Effect.promise(() =>
      services.QueryService!.setConfig({
        enabled: true,
        indexes: [
          { kind: IndexKind.Kind.SCHEMA_MATCH },
          { kind: IndexKind.Kind.GRAPH },
          { kind: IndexKind.Kind.VECTOR },
          { kind: IndexKind.Kind.FULL_TEXT },
        ],
      }),
    );
    yield* Effect.promise(() => services.QueryService!.reindex());
  });

//
// Plain plugin-manager decorator.
//

type StoryDecoratorsOptions = {
  /**
   * Enable schema/graph/vector indexes after the client boots; needed for entity-extraction
   * queries over seeded `Person` / `Organization` objects.
   * @default false
   */
  enableVectorIndex?: boolean;
};

/**
 * Standard plugin-manager decorator for transcription stories: core plugins, `ClientPlugin` with
 * `Person`/`Organization`/`TestItem` schemas + seeded test data, plus `PreviewPlugin` and
 * `TranscriptionPlugin`. Toggle `enableVectorIndex` for entity-extraction.
 */
export const createStoryDecorators = ({ enableVectorIndex = false }: StoryDecoratorsOptions = {}): Decorator[] => [
  withLayout({ layout: 'column' }),
  withPluginManager({
    plugins: [
      ...corePlugins(),
      StorybookPlugin({}),
      ClientPlugin({
        types: [TestItem, Person.Person, Organization.Organization],
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            const { personalSpace } = yield* initializeIdentity(client);
            if (enableVectorIndex) {
              yield* enableQueryIndexes(client.services.services);
            }
            yield* Effect.promise(() => seedTestData(personalSpace));
          }),
      }),
      PreviewPlugin(),
      TranscriptionPlugin(),
    ],
    // setupEvents (not fireEvents) so capabilities activate during app setup, before the always-mounted
    // driver renders: SetupSettings registers the session/settings/status capabilities it reads,
    // SetupAppGraph the graph + transcriber contributions.
    setupEvents: [AppActivationEvents.SetupSettings, AppActivationEvents.SetupAppGraph],
  }),
];

//
// Markdown-backed plugin-manager decorator.
//

type StoryGraphPluginOptions = {
  /** Plugin meta key (distinct per story so multiple graph plugins don't collide). */
  key?: string;
  /** Human-readable plugin name. */
  name?: string;
};

/**
 * Story-only plugin exposing Markdown documents in the personal space as direct children of the
 * graph root, so TranscriptionPlugin's toolbar extension can attach the record action to the doc's
 * node (mirrors the comments storybook).
 */
const StoryGraphPlugin = ({
  key = 'org.dxos.plugin.transcription.story.storyGraph',
  name = 'Story Graph',
}: StoryGraphPluginOptions = {}) =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make(key), name })).pipe(
    AppPlugin.addAppGraphModule({
      activate: Effect.fnUntraced(function* () {
        const capabilities = yield* Capability.Service;
        const extensions = yield* GraphBuilder.createExtension({
          id: 'storyDocs',
          match: NodeMatcher.whenRoot,
          connector: (_, get) =>
            Effect.gen(function* () {
              // Tolerate the teardown window when stories swap: the Client capability may already be
              // removed while this reactive connector recomputes once more (use `getAll`, not the
              // throwing `get`).
              const [client] = capabilities.getAll(ClientCapabilities.Client);
              const space = client && AppSpace.getPersonalSpace(client);
              if (!space) {
                return [];
              }

              const docs = get(space.db.query(Filter.type(Markdown.Document)).atom);
              return docs
                .map((object) => AppNode.makeObject({ get, db: space.db, object, droppable: false }))
                .filter(isNonNullable);
            }),
        });
        return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
      }),
    }),
    Plugin.make,
  )();

// Inferred from the public APIs so the helper tracks their signatures without importing non-exported types.
type ClientTypes = NonNullable<Parameters<typeof ClientPlugin>[0]['types']>;
type PersonalSpace = Effect.Effect.Success<ReturnType<typeof initializeIdentity>>['personalSpace'];

type MarkdownStoryDecoratorsOptions = {
  /**
   * Layout passed to `withLayout`.
   * @default 'column'
   */
  layout?: 'fullscreen' | 'column';

  /** ECHO schema types registered with the `ClientPlugin` (in addition to `Markdown.Document` and `Text.Text`). */
  types?: ClientTypes;

  /**
   * Story-specific setup run after identity initialization (e.g. seeding documents / test data, enabling indexes).
   * Receives the booted `client` and its `personalSpace`.
   */
  seed?: (params: { client: Client; personalSpace: PersonalSpace }) => Effect.Effect<void, Error | never, never>;

  /** Additional plugins appended after the standard markdown + transcription stack. */
  extraPlugins?: Plugin.Plugin[];

  /** Override the story graph plugin meta (distinct key/name per story). */
  graphPlugin?: StoryGraphPluginOptions;
};

/**
 * Shared `meta.decorators` for the markdown-backed transcription stories (Pipeline, PosTranscription):
 * `withLayout` + a `withPluginManager` stack of core plugins, a `ClientPlugin` (with identity init +
 * story-specific seed), Space/Markdown/StoryGraph/Transcription, and any `extraPlugins`.
 */
export const createMarkdownStoryDecorators = ({
  layout = 'column',
  types = [],
  seed,
  extraPlugins = [],
  graphPlugin,
}: MarkdownStoryDecoratorsOptions = {}): Decorator[] => [
  withLayout({ layout }),
  withPluginManager({
    setupEvents: [AppActivationEvents.SetupSettings, MarkdownEvents.SetupExtensions],
    plugins: [
      ...corePlugins(),
      ClientPlugin({
        types: [Markdown.Document, Text.Text, ...types],
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            const { personalSpace } = yield* initializeIdentity(client);
            if (seed) {
              yield* seed({ client, personalSpace });
            }
          }),
      }),
      SpacePlugin({}),
      MarkdownPlugin(),
      StoryGraphPlugin(graphPlugin),
      TranscriptionPlugin(),
      ...extraPlugins,
    ],
  }),
];
