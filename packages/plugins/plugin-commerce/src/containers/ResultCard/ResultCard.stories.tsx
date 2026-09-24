//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { type Client } from '@dxos/client';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { CommercePlugin } from '#plugin';
import { Provider, Result } from '#types';

import { makeSampleProvider, makeSampleResults } from '../../testing.ts';
import { translations } from '../../translations.ts';
import { ResultCard } from './ResultCard.tsx';

// `ResultCard` subscribes to its subject via `useObject`, so the story renders a live ECHO object
// from a seeded space (a detached fixture throws in the chromium storybook run).
const DefaultStory = ({ current }: { current?: boolean }) => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const results = useQuery(space?.db, Filter.type(Result.Result));
  const result = results[0];
  if (!result) {
    return <Loading />;
  }

  return <ResultCard subject={result} current={current} />;
};

const seedSpace = ({ client }: { client: Client }) =>
  Effect.gen(function* () {
    yield* initializeIdentity(client);
    const space = yield* Effect.promise(() => client.spaces.create());
    yield* Effect.promise(() => space.waitUntilReady());

    const provider = space.db.add(makeSampleProvider());
    // The second sample is starred — exercises the star toggle's filled state.
    space.db.add(makeSampleResults(provider)[1]);
    yield* Effect.promise(() => space.db.flush());
  });

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-commerce/ResultCard',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'centered', classNames: 'w-[20rem]' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types: [Provider.Provider, Result.Result],
          onClientInitialized: seedSpace,
        }),
        SpacePlugin({}),
        StorybookPlugin.make({}),
        CommercePlugin(),
      ],
    }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Current: Story = {
  args: {
    current: true,
  },
};
