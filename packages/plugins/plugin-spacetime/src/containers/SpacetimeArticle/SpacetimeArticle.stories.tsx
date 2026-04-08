//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Filter, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { Model, Scene } from '#types';
import { SpacetimeArticle } from './SpacetimeArticle';

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const scenes = useQuery(space?.db, Filter.type(Scene.Scene));
  const [scene, setScene] = useState<Scene.Scene>();
  useEffect(() => {
    if (scenes.length && !scene) {
      setScene(scenes[0]);
    }
  }, [scenes]);

  if (!scene) {
    return <Loading />;
  }

  return <SpacetimeArticle role='article' subject={scene} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-spacetime/containers/SpacetimeArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Scene.Scene, Model.Object],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());
              space.db.add(Scene.make({ name: 'Test Scene' }));
            }),
        }),
        StorybookPlugin({}),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Default: Story = {};
