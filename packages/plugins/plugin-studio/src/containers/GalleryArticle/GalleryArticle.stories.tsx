//
// Copyright 2026 DXOS.org
//

import { type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import * as Instructions from '@dxos/compute/Instructions';
import { Collection, Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { StudioPlugin } from '#plugin';
import { translations } from '#translations';
import { MediaArtifact, Variant } from '#types';

import { StubProjectsPlugin, makeMockArtifact } from '../../testing/index.ts';
import { GalleryArticle } from './GalleryArticle.tsx';

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
        ClientPlugin.make({
          types: [
            Collection.Collection,
            MediaArtifact.MediaArtifact,
            Variant.Variant,
            Instructions.Instructions,
            Text.Text,
          ],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());
              const collection = space.db.add(Collection.make({ name: 'Test gallery' }));
              // Seed a few artifacts, each generated from its prompt, as members.
              Obj.update(collection, (collection) => {
                collection.objects = Array.from({ length: 6 }, (_, index) =>
                  Ref.make(
                    makeMockArtifact({
                      db: space.db,
                      name: `MediaArtifact ${index + 1}`,
                      prompt: `Gallery study ${index + 1}: an abstract composition.`,
                      generated: true,
                      parent: collection,
                    }),
                  ),
                );
              });
            }),
        }),
        StudioPlugin(),
        StubProjectsPlugin(),
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

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
