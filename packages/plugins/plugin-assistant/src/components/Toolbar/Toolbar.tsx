//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { fullyQualifiedId } from '@dxos/react-client/echo';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';

import { type ChatToolbarActionsProps, useChatToolbarActions } from './useChatToolbarActions';

export const Toolbar = ({ chat, companionTo, onReset }: ChatToolbarActionsProps) => {
  const menu = useChatToolbarActions({ chat, companionTo, onReset });
  return (
    <MenuProvider {...menu} attendableId={companionTo ? fullyQualifiedId(companionTo) : fullyQualifiedId(chat)}>
      <ToolbarMenu />
    </MenuProvider>
  );
};
