//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';

import { SERVICES_CONFIG } from '@dxos/ai/testing';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Blueprint } from '@dxos/compute';
import { Script } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Config } from '@dxos/react-client';
import { Filter, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { createScript } from '#testing';
import { translations } from '#translations';

import { ScriptContainer } from './ScriptContainer';

type DefaultStoryProps = {};

/**
 * Loads the script source ref so `script.source.target` is available for the editor.
 */
const DefaultStory = (_: DefaultStoryProps) => {
  const [space] = useSpaces();
  const [script] = useQuery(space?.db, Filter.type(Script.Script));
  const [sourceReady, setSourceReady] = useState(false);

  useEffect(() => {
    if (!script) {
      setSourceReady(false);
      return;
    }

    let canceled = false;
    void (async () => {
      await script.source.load();
      if (!canceled) {
        setSourceReady(true);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [script]);

  if (!script || !sourceReady) {
    return <Loading />;
  }

  return (
    <div role='none' className='flex flex-col min-h-[80vh] w-document-max-width'>
      <ScriptContainer role='article' subject={script} attendableId='story-script' />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-script/containers/ScriptContainer',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column', classNames: 'w-document-max-width' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          config: new Config({
            runtime: {
              services: SERVICES_CONFIG.REMOTE,
            },
          }),
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
