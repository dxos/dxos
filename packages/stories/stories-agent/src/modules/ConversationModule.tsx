//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as Chat from '@dxos/assistant/Chat';
import { Filter, Obj } from '@dxos/echo';
import * as AgentChannels from '@dxos/plugin-agent/AgentChannels';
import { useQuery } from '@dxos/react-client/echo';
import * as Panel from '@dxos/react-ui/Panel';
import * as Select from '@dxos/react-ui/Select';
import * as Toolbar from '@dxos/react-ui/Toolbar';

/**
 * One of the agent's channel conversations (a Discord channel, thread or DM bridged into the space), shown by the chat
 * surface the app uses: the newest until another is picked.
 */
export const ConversationModule = (_props: Surface.ComponentProps<Record<string, unknown>>) => {
  const space = Hooks.useActiveSpace();
  const chats = useQuery(space?.db, Filter.type(Chat.Chat));
  // Created in order, so the last is the newest conversation.
  const conversations = useMemo(
    () => chats.filter((chat) => AgentChannels.conversationOf(chat) !== undefined),
    [chats],
  );
  const [selected, setSelected] = useState<string>();
  const chat = conversations.find(({ id }) => id === selected) ?? conversations.at(-1);
  const data = useMemo(() => (chat ? { subject: chat, attendableId: chat.id } : undefined), [chat]);

  return (
    <Panel.Root data-testid='agent-conversation'>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Conversation</Toolbar.Text>
          <Toolbar.Separator variant='gap' />
          {conversations.length > 1 && chat && (
            <Select.Root
              value={[chat.id]}
              onValueChange={({ value: [value] }) => value && setSelected(value)}
              items={conversations.map((conversation) => ({ value: conversation.id, label: titleOf(conversation) }))}
            >
              <Select.Trigger classNames='text-sm' />
              <Select.Content>
                {conversations.map((conversation) => (
                  <Select.Item
                    key={conversation.id}
                    classNames='text-sm'
                    item={{ value: conversation.id, label: titleOf(conversation) }}
                  />
                ))}
              </Select.Content>
            </Select.Root>
          )}
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        {data ? (
          <Surface.Surface type={AppSurface.Article} data={data} />
        ) : (
          <p className='p-2 text-description'>No channel conversations yet.</p>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

const titleOf = (chat: Chat.Chat): string => Obj.getLabel(chat) ?? chat.name ?? chat.id;
