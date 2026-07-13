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
import { Gallery, Image, ImageArtifact } from '#types';

import { GalleryArticle } from './GalleryArticle';

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const galleries = useQuery(space?.db, Filter.type(Gallery.Gallery));
  const [gallery, setGallery] = useState<Gallery.Gallery>();

  useEffect(() => {
    if (galleries.length && !gallery) {
      setGallery(galleries[0]);
    }
  }, [galleries]);

  if (!gallery) {
    return null;
  }

  return <GalleryArticle role='article' subject={gallery} attendableId='test' />;
};

const meta = {
  title: 'plugins/plugin-studio/containers/GalleryArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Gallery.Gallery, ImageArtifact.ImageArtifact, Image.Image, Instructions.Instructions, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());
              const gallery = space.db.add(Gallery.make({ name: 'Test gallery' }));
              // Seed a few ImageArtifacts, each with one generated (url) image, as gallery members.
              Obj.update(gallery, (gallery) => {
                gallery.images = Array.from({ length: 6 }, (_, index) => {
                  const artifact = ImageArtifact.make({ name: `Image ${index + 1}` });
                  const image = space.db.add(Image.make({ url: `https://picsum.photos/seed/dxos-${index}/512/512` }));
                  Obj.setParent(image, artifact);
                  Obj.update(artifact, (artifact) => {
                    artifact.images = [Ref.make(image)];
                  });
                  Obj.setParent(artifact, gallery);
                  return Ref.make(space.db.add(artifact));
                });
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
