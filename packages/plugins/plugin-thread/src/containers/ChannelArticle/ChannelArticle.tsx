//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { getSpace } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { type Channel } from '@dxos/types';

import { ChannelCompanion } from '../ChannelCompanion';

export type ChannelArticleProps = AppSurface.ObjectArticleProps<
  Channel.Channel | undefined,
  {
    roomId?: string;
    fullscreen?: boolean;
  }
>;

/**
 * Renders the channel chat. The "Start video call" action and the in-call surface
 * are contributed by plugin-calls — this container is call-agnostic.
 */
export const ChannelArticle = ({ subject: channel }: ChannelArticleProps) => {
  const space = getSpace(channel);

  if (channel && space) {
    return (
      <Panel.Root classNames='dx-document'>
        <Panel.Content asChild>
          <ChannelCompanion space={space} channel={channel} />
        </Panel.Content>
      </Panel.Root>
    );
  }

  return null;
};
