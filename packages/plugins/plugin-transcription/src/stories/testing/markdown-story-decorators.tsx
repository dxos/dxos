//
// Copyright 2026 DXOS.org
//

import { type Decorator } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import { type Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { type Client } from '@dxos/client';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Markdown, MarkdownEvents } from '@dxos/plugin-markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { TranscriptionPlugin } from '../../TranscriptionPlugin';
import { type StoryGraphPluginOptions, StoryGraphPlugin } from './markdown-transcription-harness';

// Inferred from the public APIs so the helper tracks their signatures without importing non-exported types.
type ClientTypes = NonNullable<Parameters<typeof ClientPlugin>[0]['types']>;

type PersonalSpace = Effect.Effect.Success<ReturnType<typeof initializeIdentity>>['personalSpace'];

export type MarkdownStoryDecoratorsOptions = {
  /**
   * Layout passed to `withLayout`.
   * @default 'column'
   */
  layout?: 'fullscreen' | 'column';

  /**
   * ECHO schema types registered with the `ClientPlugin` (in addition to `Markdown.Document` and `Text.Text`).
   */
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
 * Shared `meta.decorators` for the markdown-backed transcription stories (MarkdownTranscription,
 * PosTranscription, Pipeline): `withLayout` + a `withPluginManager` stack of core plugins, a
 * `ClientPlugin` (with identity init + story-specific seed), Space/Markdown/StoryGraph/Transcription,
 * and any `extraPlugins`. Stories pass only their genuine deltas (layout, extra types, seed, extra plugins).
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
