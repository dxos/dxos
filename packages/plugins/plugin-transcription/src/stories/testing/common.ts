//
// Copyright 2024 DXOS.org
//

// Helpers shared across the transcription stories: the in-memory message buffer + model adapter,
// voice-activity detection, the recording-session reader, and the plugin-manager decorator stack.

import { type Decorator } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import { useCallback, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { useAtomCapabilityState } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { IndexKind } from '@dxos/react-client/echo';
import { renderByline, useFeedModelAdapter } from '@dxos/react-ui-transcription';
import { withLayout } from '@dxos/react-ui/testing';
import { Message, Organization, Person } from '@dxos/types';
import { seedTestData } from '@dxos/types/testing';

import { TestItem } from '#testing';
import { TranscriptionCapabilities } from '#types';

import { TranscriptionPlugin } from '../../TranscriptionPlugin';

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
 * recording flag toggled by the {@link Mic} button. Non-editor stories observe this to drive their
 * own capture (the editor driver stays idle when no editor view is registered for the session).
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
// Plugin manager decorator.
//

export type StoryDecoratorsOptions = {
  /**
   * Enable schema/graph/vector indexes after the client boots; needed for entity-extraction
   * queries over seeded `Person` / `Organization` objects.
   * @default false
   */
  enableVectorIndex?: boolean;
};

/**
 * Standard plugin-manager decorator for transcription stories: core plugins,
 * `ClientPlugin` with `Person`/`Organization`/`TestItem` schemas + seeded test data, plus
 * the `PreviewPlugin` and `TranscriptionPlugin`. Toggle `enableVectorIndex` for entity-extraction.
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
