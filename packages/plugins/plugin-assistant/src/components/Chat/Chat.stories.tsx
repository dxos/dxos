//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Events, IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { remoteServiceEndpoints } from '@dxos/artifact-testing';
import { Obj, Ref } from '@dxos/echo';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ClientPlugin } from '@dxos/plugin-client';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { MapPlugin } from '@dxos/plugin-map';
import { MarkdownPlugin } from '@dxos/plugin-markdown';
import { SpacePlugin } from '@dxos/plugin-space';
import { TablePlugin } from '@dxos/plugin-table';
import { Config } from '@dxos/react-client';
import { useSpace } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { ColumnContainer, render, withLayout, withTheme } from '@dxos/storybook-utils';

import { Chat } from './Chat';
import { AssistantPlugin } from '../../AssistantPlugin';
import { meta as pluginMeta } from '../../meta';
import { translations } from '../../translations';
import { AIChatType } from '../../types';

// TDDO(burdon): Factor out base story.
const DefaultStory = () => {
  const { t } = useTranslation(pluginMeta.id);
  const space = useSpace();
  const chat = useMemo(
    () =>
      space
        ? space.db.add(
            Obj.make(AIChatType, {
              queue: Ref.fromDXN(space.queues.create().dxn),
            }),
          )
        : undefined,
    [space],
  );

  if (!chat) {
    return null;
  }

  return (
    <Chat.Root part='deck' chat={chat}>
      <Chat.Thread />
      <Chat.Prompt placeholder={t('prompt placeholder')} />
    </Chat.Root>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-assistant/Chat',
  render: render(DefaultStory),
  decorators: [
    withPluginManager({
      fireEvents: [Events.SetupArtifactDefinition],
      plugins: [
        ClientPlugin({
          config: new Config({
            runtime: {
              services: {
                edge: {
                  url: remoteServiceEndpoints.edge,
                },
                ai: {
                  server: remoteServiceEndpoints.ai,
                },
              },
            },
          }),
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
          },
        }),
        SpacePlugin(),
        SettingsPlugin(),
        IntentPlugin(),

        // TODO(burdon): Install capabilities independently?
        AssistantPlugin(),

        // Artifacts.
        ChessPlugin(),
        InboxPlugin(),
        MapPlugin(),
        MarkdownPlugin(),
        TablePlugin(),
      ],
    }),
    withTheme,
    withLayout({ Container: ColumnContainer }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof DefaultStory>;

export const Default: Story = {};
