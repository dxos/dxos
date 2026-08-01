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
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Artifact, Variant } from '#types';

import { ArtifactCard } from './ArtifactCard';

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const artifacts = useQuery(space?.db, Filter.type(Artifact.Artifact));
  const [artifact, setArtifact] = useState<Artifact.Artifact>();

  useEffect(() => {
    if (artifacts.length && !artifact) {
      setArtifact(artifacts[0]);
    }
  }, [artifacts]);

  if (!artifact) {
    return null;
  }

  return (
    <div className='is-64'>
      <ArtifactCard subject={artifact} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-studio/components/ArtifactCard',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout(),
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
              const artifact = space.db.add(Artifact.make({ name: 'Mountain lake', kind: 'image' }));
              const variant = space.db.add(
                Variant.make({ contentType: 'image/png', url: 'https://picsum.photos/seed/studio-card/512/512' }),
              );
              Obj.setParent(variant, artifact);
              Obj.update(artifact, (artifact) => {
                artifact.variants = [Ref.make(variant)];
                artifact.cover = Ref.make(variant);
              });
            }),
        }),
        StorybookPlugin({}),
      ],
    }),
  ],
  parameters: { translations },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
