//
// Copyright 2026 DXOS.org
//

import { type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';

import { StudioPlugin } from '#plugin';
import { translations } from '#translations';
import { MediaArtifact, Variant } from '#types';

import { MockProviderPlugin, StubProjectsPlugin, makeMockArtifact } from '../../testing/index.ts';
import { MediaArtifactArticle } from './MediaArtifactArticle.tsx';

/** The request config the mock provider exposes (drives the schema-driven form). */
const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const artifacts = useQuery(space?.db, Filter.type(MediaArtifact.MediaArtifact));
  const [artifact, setArtifact] = useState<MediaArtifact.MediaArtifact>();

  useEffect(() => {
    if (artifacts.length && !artifact) {
      setArtifact(artifacts[0]);
    }
  }, [artifacts]);

  if (!artifact) {
    return null;
  }

  return <MediaArtifactArticle role='article' subject={artifact} attendableId='test' />;
};

const meta_ = {
  title: 'plugins/plugin-studio/containers/MediaArtifactArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types: [MediaArtifact.MediaArtifact, Variant.Variant],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());
              // Three produced variants exercise the tabs + gallery; the prompt is on the artifact too.
              makeMockArtifact({
                db: space.db,
                name: 'Test artifact',
                prompt: 'A serene mountain lake at dawn.',
                generated: true,
                count: 3,
              });
            }),
        }),
        StudioPlugin(),
        StubProjectsPlugin(),
        MockProviderPlugin(),
        StorybookPlugin.make({}),
        PreviewPlugin.make(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta_;

type Story = StoryObj<typeof meta_>;

export const Default: Story = {};
