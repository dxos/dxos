//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { type AIServiceClient, AIServiceClientImpl, ObjectId, type Message } from '@dxos/assistant';
import { SpaceId } from '@dxos/keys';
import { ContextMenu, type ThemedClassName } from '@dxos/react-ui';
import { Icon, Input, Toolbar, useTranslation } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

import { AUTOMATION_PLUGIN } from '../../meta';
import { useClient, useConfig } from '@dxos/react-client';
import type { ReactiveEchoObject } from '@dxos/echo-db';
import { getTypename } from '@dxos/echo-schema';
import { createSystemInstructions } from './system-instructions';
import type { Space } from '@dxos/react-client/echo';

const PROPERTIES_ASSISTANT_KEY = 'dxos.assistant.beta.properties';

export type AssistantPanelProps = ThemedClassName<{
  space: Space;
  subject?: ReactiveEchoObject<any>;
}>;

export const AssistantPanel = ({ subject, classNames }: AssistantPanelProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  const config = useConfig();
  const client = useClient();
  const aiClient = useRef<AIServiceClient>();
  const [contextSpaceId, setContextSpaceId] = useState<SpaceId | undefined>();
  const [threadId, setThreadId] = useState<ObjectId | undefined>();
  const [history, setHistory] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!aiClient.current) {
      const endpoint = config.values.runtime?.services?.ai?.server;
      if (!endpoint) {
        throw new Error('AI service endpoint is not configured');
      }
      aiClient.current = new AIServiceClientImpl({
        endpoint,
      });
    }

    queueMicrotask(async () => {
      const properties = client.spaces.default.properties;

      properties[PROPERTIES_ASSISTANT_KEY] ??= {};
      properties[PROPERTIES_ASSISTANT_KEY].contextSpaceId ??= SpaceId.random();
      properties[PROPERTIES_ASSISTANT_KEY].threadId ??= ObjectId.random();

      const contextSpaceId = properties[PROPERTIES_ASSISTANT_KEY].contextSpaceId;
      const threadId = properties[PROPERTIES_ASSISTANT_KEY].threadId;

      setContextSpaceId(contextSpaceId);
      setThreadId(threadId);

      const messages = await aiClient.current!.getMessagesInThread(contextSpaceId, threadId);
      setHistory(messages);
    });
  }, []);

  const handleRequest = async (input: string) => {
    if (input === '') {
      return;
    }

    setInput('');

    // TODO(dmaretskyi): Can we call `create(Message, { ... })` here?
    const userMessage: Message = {
      id: ObjectId.random(),
      spaceId: contextSpaceId!,
      threadId: threadId!,
      role: 'user',
      content: [{ type: 'text', text: input }],
    };
    await aiClient.current!.insertMessages([userMessage]);
    setHistory([...history, userMessage]);

    const generationStream = await aiClient.current!.generate({
      model: '@anthropic/claude-3-5-sonnet-20241022',
      spaceId: contextSpaceId!,
      threadId: threadId!,
      tools: [],
      systemPrompt: await getSystemPrompt(),
    });

    const historyBefore = [...history, userMessage];
    for await (const _event of generationStream) {
      setHistory([...historyBefore, ...generationStream.accumulatedMessages]);
    }

    await aiClient.current!.insertMessages(await generationStream.complete());
  };

  const getSystemPrompt = async () => {
    return createSystemInstructions({ subject });
  };

  const clearThread = async () => {
    const properties = client.spaces.default.properties;

    properties[PROPERTIES_ASSISTANT_KEY] ??= {};
    // properties[PROPERTIES_ASSISTANT_KEY].contextSpaceId ??= SpaceId.random();
    properties[PROPERTIES_ASSISTANT_KEY].threadId = ObjectId.random();

    // const contextSpaceId = properties[PROPERTIES_ASSISTANT_KEY].contextSpaceId;
    const threadId = properties[PROPERTIES_ASSISTANT_KEY].threadId;

    // setContextSpaceId(contextSpaceId);
    setThreadId(threadId);

    const messages = await aiClient.current!.getMessagesInThread(contextSpaceId!, threadId);
    setHistory(messages);
  };

  // TODO(burdon): Factor out with script plugin.
  return (
    <div className={mx('flex flex-col h-full overflow-hidden', classNames)}>
      {history.length > 0 && (
        <div className='flex flex-col gap-6 h-full p-2 overflow-x-hidden overflow-y-auto'>
          {history.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
        </div>
      )}

      <Toolbar.Root classNames='p-1'>
        <Input.Root>
          <Input.TextInput
            autoFocus
            placeholder={t('ask me anything')}
            value={input}
            onChange={(ev) => setInput(ev.target.value)}
            onKeyDown={(ev) => ev.key === 'Enter' && handleRequest(input)}
          />
        </Input.Root>
        <ContextMenu.Root>
          <ContextMenu.Trigger asChild>
            <Toolbar.Button onClick={() => handleRequest(input)}>
              <Icon icon='ph--play--regular' size={4} />
            </Toolbar.Button>
          </ContextMenu.Trigger>
          <ContextMenu.Portal>
            <ContextMenu.Content classNames='z-[31]'>
              <ContextMenu.Viewport>
                <ContextMenu.Item onClick={clearThread}>Clear thread</ContextMenu.Item>
                <ContextMenu.Item onClick={async () => console.log(await getSystemPrompt())}>
                  Print instructions to console
                </ContextMenu.Item>
              </ContextMenu.Viewport>
            </ContextMenu.Content>
          </ContextMenu.Portal>
        </ContextMenu.Root>

        {/* <Toolbar.Button onClick={() => (state ? handleStop() : handleClear())}>
          <Icon icon={state ? 'ph--stop--regular' : 'ph--trash--regular'} size={4} />
        </Toolbar.Button> */}
      </Toolbar.Root>
    </div>
  );
};

const MessageItem = ({ classNames, message }: ThemedClassName<{ message: Message }>) => {
  const { id: _, role, content } = message;
  const styleContainer = 'flex flex-col overflow-x-hidden overflow-y-auto rounded-md gap-2 divide-y divide-separator';

  return (
    <div className={mx('flex', role === 'user' ? 'ml-[1rem] justify-end' : 'mr-[1rem]', classNames)}>
      {content.map((content, i) => {
        switch (content.type) {
          case 'text': {
            const { cot, message } = parseMessage(content.text);
            return (
              <div
                key={i}
                role='none'
                className={mx(
                  styleContainer,
                  role === 'user' ? 'bg-primary-400 dark:bg-primary-600' : 'bg-hoverSurface',
                )}
              >
                {cot && <div className='p-2 whitespace-pre-wrap text-xs text-subdued'>{cot}</div>}
                <div className='p-2 whitespace-pre-wrap'>{message}</div>
              </div>
            );
          }

          case 'tool_use': {
            return (
              <div key={i} className={mx(styleContainer, 'text-xs')}>
                <div>
                  <span className='p-2 text-primary'>Tool use</span>: {content.name} {content.id}
                </div>
                <SyntaxHighlighter language='json'>{content.inputJson}</SyntaxHighlighter>
              </div>
            );
          }

          case 'tool_result': {
            return (
              <div key={i} className={mx(styleContainer, 'text-xs', content.isError && 'text-error')}>
                <div>
                  <span className='p-2 text-primary'>Tool result</span>: {content.toolUseId}
                </div>
                <SyntaxHighlighter language='json'>{content.content}</SyntaxHighlighter>
              </div>
            );
          }
        }

        return null;
      })}
    </div>
  );
};

// TODO(burdon): Move to server-side parsing.
const parseMessage = (text: string): { cot?: string; message: string } => {
  const regex = /<cot>([\s\S]*?)<\/cot>\s*([\s\S]*)/;
  const match = text.match(regex);
  return {
    cot: match?.[1].trim(),
    message: match?.[2] ?? text ?? '\u00D8',
  };
};
