//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Blueprint } from '@dxos/blueprints';
import { Script } from '@dxos/functions';
import { Operation } from '@dxos/operation';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Filter, useQuery, useSpaces } from '@dxos/react-client/echo';
import { ObjectProperties } from '@dxos/react-ui-form';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { createScript } from '#testing';

import { translations } from '../../translations';
import { ScriptProperties } from './ScriptProperties';

type DefaultStoryProps = {};

const DefaultStory = (_: DefaultStoryProps) => {
  const [space] = useSpaces();
  const [script] = useQuery(space?.db, Filter.type(Script.Script));
  if (!script) {
    return <Loading />;
  }

  return (
    <ObjectProperties object={script}>
      <ScriptProperties role='object-properties' subject={script} />
    </ObjectProperties>
  );
};

const meta = {
  title: 'plugins/plugin-script/containers/ScriptProperties',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Script.Script, Operation.PersistentOperation, Blueprint.Blueprint, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());
              createScript(space);
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
} satisfies Meta<DefaultStoryProps>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
