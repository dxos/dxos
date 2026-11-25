//
// Copyright 2026 DXOS.org
//

import React from 'react';

import type * as Surface from '@dxos/app-framework/Surface';
import * as Hooks from '@dxos/app-toolkit/Hooks';

import { ChatColumns, type ChatColumnsProps } from './chat-columns.tsx';
import { ThreadColumns } from './thread-columns.tsx';

export type ChatPlaneModuleData = ChatColumnsProps & {
  /**
   * What the plane's columns stand for: every chat in the space (`chats`), or the newest chat and one column per
   * subagent thread while it runs (`threads`).
   */
  kind: 'chats' | 'threads';
};

/** The active space's chats as a strip of `ChatPlane` columns. */
export const ChatPlaneModule = ({ data }: Surface.ComponentProps<ChatPlaneModuleData>) => {
  const space = Hooks.useActiveSpace();
  if (!space) {
    return null;
  }

  const { kind, suggestions, defaultDrawer, align } = data;
  return kind === 'threads' ? (
    <ThreadColumns db={space.db} suggestions={suggestions} defaultDrawer={defaultDrawer} />
  ) : (
    <ChatColumns db={space.db} suggestions={suggestions} defaultDrawer={defaultDrawer} align={align} />
  );
};
