//
// Copyright 2026 DXOS.org
//

import { type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Instructions } from '@dxos/compute';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Artifact, Lightbox, Variant } from '#types';

import { StudioPlugin } from '../../StudioPlugin';
import { LightboxArticle } from './LightboxArticle';

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const lightboxes = useQuery(space?.db, Filter.type(Lightbox.Lightbox));
  const [lightbox, setLightbox] = useState<Lightbox.Lightbox>();

  useEffect(() => {
    if (lightboxes.length && !lightbox) {
      setLightbox(lightboxes[0]);
    }
  }, [lightboxes]);

  if (!lightbox) {
    return null;
  }

  return <LightboxArticle role='article' subject={lightbox} attendableId='test' />;
};

const meta = {
  title: 'plugins/plugin-studio/containers/LightboxArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Lightbox.Lightbox, Artifact.Artifact, Variant.Variant, Instructions.Instructions, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());
              const lightbox = space.db.add(Lightbox.make({ name: 'Test lightbox' }));
              // Seed Artifacts (each with a cover variant) and place them across the board grid.
              Obj.update(lightbox, (lightbox) => {
                for (let index = 0; index < 5; index++) {
                  const artifact = Artifact.make({ name: `Artifact ${index + 1}`, kind: 'image' });
                  const variant = space.db.add(
                    Variant.make({
                      contentType: 'image/png',
                      url: `https://picsum.photos/seed/lb-${index}/512/512`,
                    }),
                  );
                  Obj.setParent(variant, artifact);
                  Obj.update(artifact, (artifact) => {
                    artifact.variants = [Ref.make(variant)];
                    artifact.cover = Ref.make(variant);
                  });
                  const added = space.db.add(artifact);
                  lightbox.items.push(Ref.make(added));
                  lightbox.layout.cells[added.id] = {
                    x: (index % 3) * 2,
                    y: Math.floor(index / 3) * 2,
                    width: 2,
                    height: 2,
                  };
                }
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
