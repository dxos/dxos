//
// Copyright 2026 DXOS.org
//

import { type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Instructions } from '@dxos/compute';
import { Obj, Ref } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Artifact, Variant } from '#types';

import { StudioPlugin } from '../../StudioPlugin';
import { ArtifactsArticle } from './ArtifactsArticle';

const DefaultStory = () => {
  const spaces = useSpaces();
  const space: Space | undefined = spaces[spaces.length - 1];
  if (!space) {
    return null;
  }
  return <ArtifactsArticle role='article' space={space} attendableId='test' />;
};

const meta = {
  title: 'plugins/plugin-studio/containers/ArtifactsArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Artifact.Artifact, Variant.Variant, Instructions.Instructions, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());
              // Seed a mix of image + video artifacts, each with a cover variant.
              for (let index = 0; index < 6; index++) {
                const kind = index % 3 === 0 ? 'video' : 'image';
                const artifact = space.db.add(Artifact.make({ name: `Artifact ${index + 1}`, kind }));
                const variant = space.db.add(
                  Variant.make({
                    contentType: kind === 'video' ? 'video/mp4' : 'image/png',
                    url: `https://picsum.photos/seed/hub-${index}/512/512`,
                  }),
                );
                Obj.setParent(variant, artifact);
                Obj.update(artifact, (artifact) => {
                  artifact.variants = [Ref.make(variant)];
                  artifact.cover = Ref.make(variant);
                });
              }
            }),
        }),
        StudioPlugin(),
        StorybookPlugin({}),
        PreviewPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
