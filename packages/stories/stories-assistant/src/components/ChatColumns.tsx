//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AssistantChat from '@dxos/assistant/Chat';
import { type Database, Filter, Obj } from '@dxos/echo';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import * as Chat from '@dxos/plugin-assistant/Chat';
import * as ChatPlane from '@dxos/plugin-assistant/ChatPlane';
import * as AssistantHooks from '@dxos/plugin-assistant/Hooks';
import { useObject, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Dnd } from '@dxos/react-ui-dnd';
import { MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Panel from '@dxos/react-ui/Panel';
import { arrayMove } from '@dxos/util';

import { useThreadModel } from './hooks.ts';

type ChatColumnProps = {
  db: Database.Database;
  chat: AssistantChat.Chat;
  /** The chat's place in the strip, which decides what its menu offers. */
  index: number;
  count: number;
  onMove: (id: string, index: number) => void;
  onDelete: (chat: AssistantChat.Chat) => void;
};

/** One chat with a chat model of its own, so a turn keeps running after the reader moves to another column. */
const ChatColumn = ({ db, chat, index, count, onMove, onDelete }: ChatColumnProps) => {
  const settings = Hooks.useAtomCapability(AssistantCapabilities.Settings);
  const { preset, ...chatProps } = AssistantHooks.usePresets(settings, chat);
  const chatModel = useThreadModel(db, chat);
  const [name] = useObject(chat, 'name');
  // Sending before a new chat reaches the database would leave the agent unable to resolve it.
  const handleSubmit = useCallback(() => db.flush(), [db]);
  const menu = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: 'Chat' })
        .action(
          'move-left',
          {
            label: 'Move left',
            icon: 'ph--arrow-left--regular',
            disabled: index === 0,
            testId: 'chat-plane.move-left',
          },
          () => onMove(chat.id, index - 1),
        )
        .action(
          'move-right',
          {
            label: 'Move right',
            icon: 'ph--arrow-right--regular',
            disabled: index === count - 1,
            testId: 'chat-plane.move-right',
          },
          () => onMove(chat.id, index + 1),
        )
        .action(
          'delete',
          { label: 'Delete', icon: 'ph--trash--regular', disabled: count === 1, testId: 'chat-plane.delete' },
          () => onDelete(chat),
        )
        .build(),
    [chat, index, count, onMove, onDelete],
  );
  if (!chatModel) {
    return null;
  }

  return (
    <Chat.Root chat={chat} db={db} chatModel={chatModel} onSubmit={handleSubmit}>
      <ChatPlane.Column value={chat.id}>
        <ChatPlane.Cell menu={menu} title={name ?? `Chat ${index + 1}`}>
          <Panel.Body asChild>
            <Chat.Content>
              <Chat.Thread tailLines={4} />
            </Chat.Content>
          </Panel.Body>
        </ChatPlane.Cell>
        <ChatPlane.Prompt>
          <Chat.Activity />
          <Chat.Prompt {...chatProps} outline preset={preset?.id} />
        </ChatPlane.Prompt>
      </ChatPlane.Column>
    </Chat.Root>
  );
};

/**
 * Every chat in the space as a column of its own: the selected chat rests at the center of the strip with its prompt
 * beneath it, a new chat is added at either end, and a column is dragged, or moved from its menu, to reorder.
 */
export const ChatColumns = () => {
  const [space] = useSpaces();
  const db = space?.db;
  const chats = useQuery(db, Filter.type(AssistantChat.Chat));
  const { invokePromise } = Hooks.useOperationInvoker();

  // Ids are time-ordered, so a chat lands at the end of the strip unless it was added at the start or dragged.
  const [order, setOrder] = useState<readonly string[]>([]);
  const ordered = useMemo(() => {
    const sorted = chats.toSorted((a, b) => a.id.localeCompare(b.id));
    const position = ({ id }: AssistantChat.Chat) => {
      const index = order.indexOf(id);
      return index === -1 ? order.length : index;
    };
    return sorted.toSorted((a, b) => position(a) - position(b));
  }, [chats, order]);

  const [currentId, setCurrentId] = useState<string>();
  // A chat just created is not in the query yet, so an unknown id holds the position until it arrives.
  const lastIndexRef = useRef(0);
  const found = ordered.findIndex(({ id }) => id === currentId);
  const index = found === -1 ? Math.max(Math.min(lastIndexRef.current, ordered.length - 1), 0) : found;
  if (found !== -1) {
    lastIndexRef.current = found;
  }
  const current = ordered.at(index);

  const handleAdd = useCallback(
    async (side: ChatPlane.Side) => {
      if (!db) {
        return;
      }
      const created = await invokePromise(
        AssistantOperation.CreateChat,
        { name: `Chat ${ordered.length + 1}` },
        { spaceId: db.spaceId },
      );
      if (created.error || !created.data) {
        throw created.error ?? new Error('Chat was not created.');
      }
      // The operation returns the chat unfiled, for the caller to persist.
      const chat = db.add(created.data.object);
      // A new chat answers from the model the selected one uses, which in a scripted story is the script.
      const session = current?.session;
      if (session) {
        Obj.update(chat, (chat) => {
          chat.session = { ...session };
        });
      }
      if (side === 'start') {
        setOrder([chat.id, ...ordered.map(({ id }) => id)]);
      }
      setCurrentId(chat.id);
    },
    [db, invokePromise, ordered, current],
  );

  const handleMove = useCallback(
    (id: string, index: number) => {
      const next = ordered.map((chat) => chat.id);
      setOrder(arrayMove(next, next.indexOf(id), index));
    },
    [ordered],
  );

  const handleDelete = useCallback((chat: AssistantChat.Chat) => db?.remove(chat), [db]);

  if (!db || !current) {
    return null;
  }

  return (
    <Dnd.Root>
      <ChatPlane.Root value={current.id} onValueChange={setCurrentId} onAdd={handleAdd} onMove={handleMove}>
        <ChatPlane.Viewport>
          <ChatPlane.Add side='start' />
          <ChatPlane.Columns items={ordered}>
            {(id) => {
              const position = ordered.findIndex((chat) => chat.id === id);
              const chat = ordered.at(position);
              return (
                chat && (
                  <ChatColumn
                    db={db}
                    chat={chat}
                    index={position}
                    count={ordered.length}
                    onMove={handleMove}
                    onDelete={handleDelete}
                  />
                )
              );
            }}
          </ChatPlane.Columns>
          <ChatPlane.Add side='end' />
        </ChatPlane.Viewport>
      </ChatPlane.Root>
    </Dnd.Root>
  );
};
