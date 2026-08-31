//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Chat } from '@dxos/assistant-toolkit';
import { Obj } from '@dxos/echo';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { AssistantOperation } from '#types';

import ChatArticle from '../ChatArticle';

/** Null until the companion-chat provisioner resolves or creates the chat. */
type ProvisionableChat = Chat.Chat | null;

export type ChatCompanionProps = AppSurface.ArticleProps<ProvisionableChat, {}, Obj.Unknown>;

export const ChatCompanion = forwardRef<HTMLDivElement, ChatCompanionProps>(
  ({ role = 'article', subject: chat, companionTo, attendableId }, forwardedRef) => {
    const { invokePromise } = useOperationInvoker();
    const db = Obj.getDatabase(companionTo);

    // Persist (and flush) a transient chat before the first request so the agent can resolve
    // the now-durable conversation feed; subsequent submits are a no-op once persisted.
    const handleSubmit = useCallback(async () => {
      if (!db || !chat || Obj.getDatabase(chat)) {
        return;
      }

      // Ref on the subject (annotation) + parent edge: the chat belongs to its subject (cascades
      // on delete, keeps it out of the standalone Chats section).
      Chat.linkCompanion({ chat, subject: companionTo });
      await invokePromise(SpaceOperation.AddObject, { object: chat }, { spaceId: db.spaceId });
      await invokePromise(AssistantOperation.SetCurrentChat, {
        companionTo,
        chat,
      });
      await db.flush();
    }, [db, chat, companionTo, invokePromise]);

    if (!chat) {
      return null;
    }

    return (
      <ChatArticle
        role={role}
        subject={chat}
        attendableId={attendableId}
        companionTo={companionTo}
        onSubmit={handleSubmit}
        ref={forwardedRef}
      />
    );
  },
);

ChatCompanion.displayName = 'ChatCompanion';
