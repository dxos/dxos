//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withTheme } from '@dxos/react-ui/testing';

import * as AutocuePlugin from '#meta';
import { translations } from '#translations';
import { AutocueBundle } from '#types';

import { FIXTURE_BUNDLE_URL } from '../../testing/index.ts';
import { AutocueArticle } from './AutocueArticle.tsx';

const DefaultStory = () => {
  const [space] = useSpaces();
  const [bundle] = useQuery(space?.db, Filter.type(AutocueBundle.AutocueBundle));
  if (!bundle) {
    return <Loading />;
  }

  return <AutocueArticle role='article' subject={bundle} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-autocue/containers/AutocueArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withPluginManager({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          types: [AutocueBundle.AutocueBundle],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());
              space.db.add(AutocueBundle.make({ name: 'Chess', url: FIXTURE_BUNDLE_URL }));
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        AutocuePlugin.make(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
