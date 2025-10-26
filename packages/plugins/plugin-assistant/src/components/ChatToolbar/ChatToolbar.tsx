//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { fullyQualifiedId } from '@dxos/react-client/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';

import { type ChatToolbarActionsProps, useChatToolbarActions } from './useChatToolbarActions';

export type ChatToolbarProps = ThemedClassName<ChatToolbarActionsProps>;

export const ChatToolbar = ({ chat, companionTo, onReset, classNames }: ChatToolbarProps) => {
  const menu = useChatToolbarActions({ chat, companionTo, onReset });

  return (
    <MenuProvider {...menu} attendableId={companionTo ? fullyQualifiedId(companionTo) : fullyQualifiedId(chat)}>
      <ToolbarMenu classNames={classNames} textBlockWidth />
    </MenuProvider>
  );
};
