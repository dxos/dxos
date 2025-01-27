import '@dxos-theme';
import type { Meta } from '@storybook/react';
import React, { useCallback, useRef, useState } from 'react';
import { mx } from '@dxos/react-ui-theme';
import { Input, type ThemedClassName } from '@dxos/react-ui';
import { AIServiceClientImpl, type Message } from '@dxos/assistant';
import { ObjectId } from '@dxos/echo-schema';
import { TextBox, type TextBoxControl } from '../components';
import { withTheme } from '@dxos/storybook-utils';
import { log } from '@dxos/log';

const AI_SERVICE_ENDPOINT = 'http://localhost:8788';

export const Default = () => {
  const [aiServiceClient] = useState(() => new AIServiceClientImpl({ endpoint: AI_SERVICE_ENDPOINT }));
  const [isGenerating, setIsGenerating] = useState(false);

  const [history, setHistory] = useState<Message[]>(() => [
    { id: ObjectId.random(), role: 'user', content: [{ type: 'text', text: 'Hello' }] },
    {
      id: ObjectId.random(),
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello, how can I help you today?' }],
    },
  ]);

  log.info('items', { items: history });

  const onSubmit = useCallback(
    async (message: string) => {
      if (isGenerating) {
        return;
      }

      try {
        setIsGenerating(true);
        let historyState = [...history];
        historyState.push({ id: ObjectId.random(), role: 'user', content: [{ type: 'text', text: message }] });
        setHistory([...historyState]);

        const response = await aiServiceClient.generate({
          model: '@anthropic/claude-3-5-sonnet-20241022',
          history: historyState,
          tools: [],
        });

        // TODO(dmaretskyi): Have to drain the stream manually.
        queueMicrotask(async () => {
          for await (const event of response) {
            log.info('event', { event });
            setHistory([...historyState, ...response.accumulatedMessages]);
          }
        });

        const assistantMessages = await response.complete();
        log.info('assistantMessages', { assistantMessages: structuredClone(assistantMessages) });
        historyState.push(...assistantMessages);
        setHistory([...historyState]);
      } finally {
        setIsGenerating(false);
      }
    },
    [aiServiceClient, history],
  );

  return (
    <div className='grid grid-cols-2 w-full h-full divide-x divide-separator'>
      <div className='p-4'>
        <Thread items={history} onSubmit={onSubmit} isGenerating={isGenerating} />
      </div>
      <div>Right panel</div>
    </div>
  );
};

type ThreadProps = {
  items: Message[];
  onSubmit: (message: string) => void;
  isGenerating?: boolean;
};

const Thread = ({ items, onSubmit, isGenerating }: ThreadProps) => {
  const inputBox = useRef<TextBoxControl>(null);
  return (
    <div>
      {items.map((item, i) => (
        <ThreadItem key={i} item={item} />
      ))}
      {isGenerating && (
        <div className='flex gap-2 items-center'>
          <span className='text-2xl text-gray-400 animate-[blink_1.5s_ease-in-out_infinite]'>•</span>
          <span className='text-2xl text-gray-400 animate-[blink_1.5s_ease-in-out_infinite] delay-500'>•</span>
          <span className='text-2xl text-gray-400 animate-[blink_1.5s_ease-in-out_infinite] delay-1000'>•</span>
        </div>
      )}
      <div>
        <TextBox
          classNames='bg-blue-100 dark:bg-blue-800'
          ref={inputBox}
          onEnter={(value) => {
            onSubmit(value);
            inputBox.current?.setText('');
          }}
        />
      </div>
    </div>
  );
};

type ThreadItemProps = ThemedClassName & {
  item: Message;
};

const ThreadItem = ({ classNames, item }: ThreadItemProps) => {
  if (typeof item !== 'object') {
    return <div className={mx(classNames)}>{item}</div>;
  }

  // TODO(burdon): Hack; introspect type.
  // TODO(burdon): Markdown parser.
  const { role, content } = item;
  return (
    <div className={mx('flex', classNames, role === 'user' && 'justify-end')}>
      <div
        className={mx(
          'block rounded-md p-1 px-2 text-sm',
          role === 'user' ? 'bg-blue-100 dark:bg-blue-800' : 'whitespace-pre-wrap bg-neutral-50 dark:bg-neutral-800',
        )}
      >
        {content.map((item, idx) => {
          switch (item.type) {
            case 'text':
              return <div key={idx}>{item.text}</div>;
            default:
              return (
                <div key={idx} className='text-xs text-gray-500 text-pre'>
                  {JSON.stringify(item, null, 2)}
                </div>
              );
          }
        })}
      </div>
    </div>
  );
};

export default {
  title: 'plugins/plugin-canvas/compute/artifacts',
  component: Default,
  decorators: [withTheme],
} satisfies Meta<typeof Default>;
