//
// Copyright 2026 DXOS.org
//

import { type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Instructions } from '@dxos/compute';
import { Filter, Obj, Ref } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Image, ImageArtifact } from '#types';

import { ImageArtifactArticle } from './ImageArtifactArticle';

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const artifacts = useQuery(space?.db, Filter.type(ImageArtifact.ImageArtifact));
  const [artifact, setArtifact] = useState<ImageArtifact.ImageArtifact>();

  useEffect(() => {
    if (artifacts.length && !artifact) {
      setArtifact(artifacts[0]);
    }
  }, [artifacts]);

  if (!artifact) {
    return null;
  }

  return <ImageArtifactArticle role='article' subject={artifact} attendableId='test' />;
};

const meta = {
  title: 'plugins/plugin-image/containers/ImageArtifactArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [ImageArtifact.ImageArtifact, Image.Image, Instructions.Instructions, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());
              const prompt = 'A serene mountain lake at dawn.';
              const artifact = space.db.add(ImageArtifact.make({ name: 'Test image', prompt }));
              // Seed a few generated images (remote placeholders) to exercise the tabs + gallery.
              Obj.update(artifact, (artifact) => {
                artifact.images = Array.from({ length: 3 }, (_, index) =>
                  Ref.make(
                    space.db.add(
                      Image.make({
                        url: `https://picsum.photos/seed/dxos-${index}/512/512`,
                        prompt,
                        seed: index,
                        model: 'demo',
                        resolution: '512x512',
                      }),
                    ),
                  ),
                );
              });
            }),
        }),
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
