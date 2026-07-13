//
// Copyright 2026 DXOS.org
//

import { type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Instructions } from '@dxos/compute';
import { Collection, Filter, Obj, Ref } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Artifact, Variant } from '#types';

import { GalleryArticle } from './GalleryArticle';

import { StudioPlugin } from '../../StudioPlugin';

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const collections = useQuery(space?.db, Filter.type(Collection.Collection));
  const [collection, setCollection] = useState<Collection.Collection>();

  useEffect(() => {
    if (collections.length && !collection) {
      setCollection(collections[0]);
    }
  }, [collections]);

  if (!collection) {
    return null;
  }

  return <GalleryArticle role='article' subject={collection} attendableId='test' />;
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
          types: [Collection.Collection, Artifact.Artifact, Variant.Variant, Instructions.Instructions, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());
              const collection = space.db.add(Collection.make({ name: 'Test gallery' }));
              // Seed a few Artifacts, each with one generated (url) cover variant, as members.
              Obj.update(collection, (collection) => {
                collection.objects = Array.from({ length: 6 }, (_, index) => {
                  const artifact = Artifact.make({ name: `Artifact ${index + 1}`, kind: 'image' });
                  const variant = space.db.add(
                    Variant.make({
                      contentType: 'image/png',
                      url: `https://picsum.photos/seed/dxos-${index}/512/512`,
                    }),
                  );
                  Obj.setParent(variant, artifact);
                  Obj.update(artifact, (artifact) => {
                    artifact.variants = [Ref.make(variant)];
                    artifact.cover = Ref.make(variant);
                  });
                  Obj.setParent(artifact, collection);
                  return Ref.make(space.db.add(artifact));
                });
              });
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
