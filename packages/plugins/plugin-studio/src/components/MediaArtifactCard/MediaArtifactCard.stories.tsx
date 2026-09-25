//
// Copyright 2026 DXOS.org
//

import { type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import * as Instructions from '@dxos/compute/Instructions';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Card } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { MediaArtifact, Variant } from '#types';

import { MediaArtifactCard } from './MediaArtifactCard.tsx';

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

  // The host's `Card.Root` and header, as a board cell supplies them.
  return (
    <Card.Root classNames='w-64'>
      <Card.Header>
        <Card.Title>{Obj.getLabel(artifact)}</Card.Title>
      </Card.Header>
      <MediaArtifactCard subject={artifact} />
    </Card.Root>
  );
};

const meta = {
  title: 'plugins/plugin-studio/components/MediaArtifactCard',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout(),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types: [MediaArtifact.MediaArtifact, Variant.Variant, Instructions.Instructions, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());
              const artifact = space.db.add(MediaArtifact.make({ name: 'Mountain lake', kind: 'image' }));
              const variant = space.db.add(
                Variant.make({
                  [Obj.Parent]: artifact,
                  contentType: 'image/png',
                  url: 'https://picsum.photos/seed/studio-card/512/512',
                }),
              );
              Obj.update(artifact, (artifact) => {
                artifact.variants = [Ref.make(variant)];
                artifact.cover = Ref.make(variant);
              });
            }),
        }),
        StorybookPlugin.make({}),
      ],
    }),
  ],
  parameters: { translations },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
