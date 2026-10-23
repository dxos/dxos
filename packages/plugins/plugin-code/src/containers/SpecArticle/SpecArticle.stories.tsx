//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Spec } from '@dxos/types';

import { translations } from '#translations';

import CHESS_1_MDL from '../../../../../reflect/deus/lang/examples/chess-1.mdl?raw';
import CONNECTOR_EVENTS_MDL from '../../../../plugin-connector/spec/EVENTS.mdl?raw';
import GITHUB_FILE_SYNC_MDL from '../../../../plugin-github/spec/FILE-SYNC.mdl?raw';
import GITHUB_SYNC_MDL from '../../../../plugin-github/spec/SYNC.mdl?raw';
import PLUGIN_CODE_MDL from '../../../PLUGIN.mdl?raw';
import PLUGIN_CODE_BASE_MDL from './__fixtures__/plugin-code.base.mdl?raw';
import { SpecArticle } from './SpecArticle.tsx';

const DefaultStory = ({ content }: { content?: string }) => {
  const spaces = useSpaces();
  const space = spaces[0];
  const [spec, setSpec] = useState<Spec.Spec | undefined>();

  useEffect(() => {
    if (space && !spec) {
      setSpec(space.db.add(Spec.make({ content })));
    }
  }, [space, content, spec]);

  if (!spec) {
    return <Loading />;
  }

  return <SpecArticle role='article' subject={spec} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-code/containers/SpecArticle',
  render: (args: { content?: string }) => <DefaultStory {...args} />,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    // The article reads the identity and invokes operations, so it needs the client and the plugin manager.
    withPluginManager({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          types: [Spec.Spec],
          onClientInitialized: ({ client }) => initializeIdentity(client).pipe(Effect.asVoid),
        }),
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

export const Chess: Story = {
  args: {
    content: CHESS_1_MDL,
  },
};

export const GitHubSync: Story = {
  args: {
    content: GITHUB_SYNC_MDL,
  },
};

export const GitHubFileSync: Story = {
  args: {
    content: GITHUB_FILE_SYNC_MDL,
  },
};

export const ConnectorEvents: Story = {
  args: {
    content: CONNECTOR_EVENTS_MDL,
  },
};

/** plugin-code's spec against an earlier commit of it, opened in diff mode: three new features and their decisions. */
export const Diff: Story = {
  render: () => (
    <SpecArticle
      role='article'
      attendableId='story'
      content={PLUGIN_CODE_MDL}
      base={PLUGIN_CODE_BASE_MDL}
      defaultDiff='base'
    />
  ),
};
