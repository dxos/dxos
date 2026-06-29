//
// Copyright 2026 DXOS.org
//

import { type Decorator } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { IndexKind } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';
import { Organization, Person } from '@dxos/types';
import { seedTestData } from '@dxos/types/testing';

import { TranscriptionPlugin } from '../TranscriptionPlugin';
import { TestItem } from './testing';

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
