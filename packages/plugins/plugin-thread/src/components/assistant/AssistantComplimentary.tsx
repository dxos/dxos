//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { type AIServiceClient, AIServiceClientImpl, ObjectId, type Message } from '@dxos/assistant';
import { type SpaceId } from '@dxos/keys';
import type { ThemedClassName } from '@dxos/react-ui';
import { Icon, Input, Toolbar, useTranslation } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

import { THREAD_PLUGIN } from '../../meta';

// TODO(dmaretskyi): To config.services.ai.
const ENDPOINT = 'https://ai-service.dxos.workers.dev';

// TODO(dmaretskyi): Store those in the space.
const spaceId = 'B6SOMMBOQ65BB5CK45NEGTHFH34LHFE3Q' as SpaceId;
const threadId = '01JCQK4FPE5922XZZQPQPSFENX' as ObjectId;

export const AssistantComplimentary = () => {
  const { t } = useTranslation(THREAD_PLUGIN);

  const client = useRef<AIServiceClient>();
  const [history, setHistory] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!client.current) {
      client.current = new AIServiceClientImpl({
        endpoint: ENDPOINT,
      });
    }
    queueMicrotask(async () => {
      const messages = await client.current!.getMessagesInThread(spaceId, threadId);
      setHistory(messages);
    });
  }, []);

  const handleRequest = async (input: string) => {
    // TODO(dmaretskyi): Can we call `create(Message, { ... })` here?
    const userMessage: Message = {
      id: ObjectId.random(),
      spaceId,
      threadId,
      role: 'user',
      content: [{ type: 'text', text: input }],
    };
    await client.current!.insertMessages([userMessage]);
    setHistory([...history, userMessage]);
    setInput('');

    const generationStream = await client.current!.generate({
      model: '@anthropic/claude-3-5-sonnet-20241022',
      spaceId,
      threadId,
      tools: [],
      systemPrompt: INSTRUCTIONS,
    });

    const historyBefore = [...history, userMessage];
    for await (const _event of generationStream) {
      setHistory([...historyBefore, ...generationStream.accumulatedMessages]);
    }
    await client.current!.insertMessages(await generationStream.complete());
  };

  return (
    <div className={mx('flex flex-col h-full overflow-hidden')}>
      <div className='flex flex-col gap-6 h-full p-2 overflow-x-hidden overflow-y-auto'>
        {history.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>

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
        <Toolbar.Button onClick={() => handleRequest(input)}>
          <Icon icon='ph--play--regular' size={4} />
        </Toolbar.Button>
        {/* <Toolbar.Button onClick={() => (state ? handleStop() : handleClear())}>
          <Icon icon={state ? 'ph--stop--regular' : 'ph--trash--regular'} size={4} />
        </Toolbar.Button> */}
      </Toolbar.Root>
    </div>
  );
};

const MessageItem = ({ classNames, message }: ThemedClassName<{ message: Message }>) => {
  const { id, role, content } = message;
  const wrapper = 'p-1 px-2 rounded-lg bg-hoverSurface overflow-auto';
  return (
    <div className={mx('flex', role === 'user' ? 'ml-[1rem] justify-end' : 'mr-[1rem]', classNames)}>
      {content.map((content, i) => {
        switch (content.type) {
          case 'text': {
            return (
              <div
                key={i}
                className={mx(wrapper, 'whitespace-pre', role === 'user' && 'bg-primary-400 dark:bg-primary-600')}
              >
                {content.text || '\u00D8'}
              </div>
            );
          }
          case 'tool_use': {
            return (
              <div key={i} className={mx(wrapper, 'px-8 py-2 text-xs')}>
                <p>
                  <b>Tool Use</b> {content.name} {content.id}
                </p>
                <SyntaxHighlighter language='json'>{content.inputJson}</SyntaxHighlighter>
              </div>
            );
          }
          case 'tool_result': {
            return (
              <div key={i} className={mx(wrapper, 'px-8 py-2 text-xs', content.isError && 'whitespace-pre text-error')}>
                <p>
                  <b>Tool Result</b> {content.toolUseId}
                </p>
                <SyntaxHighlighter language='json'>{content.content}</SyntaxHighlighter>
              </div>
            );
          }
        }
      })}
    </div>
  );
};

export default AssistantComplimentary;

const INSTRUCTIONS = `
  Before replying always think step-by-step on how to proceed.
  Print your thoughts inside <cot> tags.

  <example>
    <cot>To answer the question I need to ...</cot>
  </example>
`;
