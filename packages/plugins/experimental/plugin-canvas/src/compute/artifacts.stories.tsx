//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';
import type { Meta } from '@storybook/react';
import React, { useEffect, useRef, useState } from 'react';

import { Surface } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AIServiceClientImpl, isToolUse, Message, runTools } from '@dxos/assistant';
import { raise } from '@dxos/debug';
import { createStatic, HasTypename, ObjectId } from '@dxos/echo-schema';
import { EdgeHttpClient } from '@dxos/edge-client';
import { DXN, QueueSubspaceTags, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Icon, Input, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { withLayout, withSignals, withTheme } from '@dxos/storybook-utils';

import { create } from '@dxos/live-object';
import { TextBox, type TextBoxControl } from '../components';
import { artifacts, capabilities, type ArtifactsContext } from './testing';
import { ARTIFACTS_SYSTEM_PROMPT } from './testing/prompts';

const EDGE_SERVICE_ENDPOINT = 'http://localhost:8787';
const AI_SERVICE_ENDPOINT = 'http://localhost:8788';

/**
 * A custom hook that ensures a callback reference remains stable while allowing the callback
 * implementation to be updated. This is useful for callbacks that need to access the latest
 * state/props values while maintaining a stable reference to prevent unnecessary re-renders.
 *
 * @template F - The function type of the callback.
 * @param callback - The callback function to memoize.
 * @returns A stable callback reference that will always call the latest implementation.
 */
// TODO(dmaretskyi): Move to where it needs to be.
const useDynamicCallback = <F extends (...args: any[]) => any>(callback: F): F => {
  const ref = useRef<F>(callback);
  ref.current = callback;
  return ((...args) => ref.current(...args)) as F;
};

type UseQueueOptions = {
  pollInterval?: number;
};

const useQueue = <T,>(edgeHttpClient: EdgeHttpClient, queueDxn: DXN, options: UseQueueOptions = {}) => {
  const { subspaceTag, spaceId, queueId } = queueDxn.asQueueDXN() ?? raise(new Error('Invalid queue DXN'));

  const [objects, setObjects] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Only for initial load.
  const [error, setError] = useState<Error | null>(null);
  const refreshId = useRef<number>(0);

  const append = useDynamicCallback(async (items: T[]) => {
    try {
      setObjects((prevItems) => [...prevItems, ...items]);

      edgeHttpClient.insertIntoQueue(subspaceTag, spaceId, queueId, items);
    } catch (err) {
      setError(err as Error);
    }
  });

  const refresh = useDynamicCallback(async () => {
    const thisRefreshId = ++refreshId.current;
    try {
      const { objects } = await edgeHttpClient.queryQueue(subspaceTag, spaceId, { queueId });
      if (thisRefreshId !== refreshId.current) {
        return;
      }
      setObjects(objects as T[]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (options.pollInterval) {
      const poll = () => {
        refresh().finally(() => {
          interval = setTimeout(poll, options.pollInterval);
        });
      };
      poll();
    }
    return () => clearInterval(interval);
  }, [options.pollInterval]);

  useEffect(() => {
    refresh();
  }, [queueDxn.toString()]);

  return {
    objects,
    append,
    isLoading,
    error,
  };
};

export const Default = () => {
  const [edgeHttpClient] = useState(() => new EdgeHttpClient(EDGE_SERVICE_ENDPOINT));
  const [aiServiceClient] = useState(() => new AIServiceClientImpl({ endpoint: AI_SERVICE_ENDPOINT }));
  const [isGenerating, setIsGenerating] = useState(false);
  const [queueDxn, setQueueDxn] = useState(() =>
    new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, SpaceId.random(), ObjectId.random()]).toString(),
  );
  const [artifactsList, setArtifactsList] = useState<HasTypename[]>(() => []);

  const historyQueue = useQueue<Message>(edgeHttpClient, DXN.parse(queueDxn));

  // const isFirstLoad = useRef(true);
  // useEffect(() => {
  //   if (!isFirstLoad.current) {
  //     return;
  //   }
  //   isFirstLoad.current = false;
  //   historyQueue.append([
  //     createStatic(Message, { role: 'user', content: [{ type: 'text', text: 'Hello' }] }),
  //     createStatic(Message, {
  //       role: 'assistant',
  //       content: [{ type: 'text', text: 'Hello, how can I help you today?' }],
  //     }),
  //   ]);
  // }, []);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);

  log.info('items', { items: history });

  const handleSubmit = useDynamicCallback(async (message: string) => {
    log.info('handleSubmit', { history });
    if (isGenerating) {
      return;
    }

    try {
      setIsGenerating(true);

      const history = [...historyQueue.objects];
      const append = (msgs: Message[]) => {
        historyQueue.append(msgs);
        history.push(...msgs);
      };

      const userMessage = createStatic(Message, {
        role: 'user',
        content: [{ type: 'text', text: message }],
      });
      append([userMessage]);

      generate: while (true) {
        const response = await aiServiceClient.generate({
          model: '@anthropic/claude-3-5-sonnet-20241022',
          history,
          systemPrompt: ARTIFACTS_SYSTEM_PROMPT,
          tools: [...artifacts['plugin-chess'].tools],
        });

        // TODO(dmaretskyi): Have to drain the stream manually.
        queueMicrotask(async () => {
          for await (const event of response) {
            log.info('event', { event });
            setPendingMessages([...response.accumulatedMessages.map((m) => createStatic(Message, m))]);
          }
        });

        const assistantMessages = await response.complete();
        log.info('assistantMessages', { assistantMessages: structuredClone(assistantMessages) });
        append([...assistantMessages.map((m) => createStatic(Message, m))]);
        setPendingMessages([]);

        if (isToolUse(assistantMessages.at(-1)!)) {
          const reply = await runTools({
            tools: artifacts['plugin-chess'].tools,
            message: assistantMessages.at(-1)!,
            context: {
              artifacts: {
                getArtifacts: () => artifactsList,
                addArtifact: (artifact) => setArtifactsList((artifactsList) => [...artifactsList, artifact]),
              },
            },
          });
          switch (reply.type) {
            case 'continue': {
              append([reply.message]);
              break;
            }
            case 'break': {
              break generate;
            }
          }
        } else {
          break;
        }
      }
    } finally {
      setIsGenerating(false);
    }
  });

  return (
    <div className='grid grid-cols-2 w-full h-full divide-x divide-separator'>
      <div className='p-4 overflow-y-auto'>
        <div className='flex gap-2 items-center'>
          <Input.Root>
            <Input.TextInput
              classNames='w-full text-sm px-2 py-1 border rounded'
              type='text'
              value={queueDxn}
              onChange={(e) => setQueueDxn(e.target.value)}
            />
            <Icon icon='ph--copy--regular' onClick={() => navigator.clipboard.writeText(queueDxn)} />
          </Input.Root>
        </div>
        <Thread
          items={[...historyQueue.objects, ...pendingMessages]}
          onSubmit={handleSubmit}
          isGenerating={isGenerating}
        />
      </div>
      <div className='p-4 overflow-y-auto flex flex-col gap-4'>
        {artifactsList.map((item, idx) => (
          <Surface key={idx} role='canvas-node' limit={1} data={item} />
        ))}
      </div>
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
    <div className='overflow-y-auto'>
      {items.map((item, i) => (
        <ThreadItem key={i} item={item} />
      ))}
      {isGenerating && <Icon icon='ph--spinner-gap--regular' classNames='animate-spin' />}
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
  decorators: [withTheme, withSignals, withLayout({ fullscreen: true }), withPluginManager({ capabilities })],
} satisfies Meta<typeof Default>;
