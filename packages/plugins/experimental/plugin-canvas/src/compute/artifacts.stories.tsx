//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import type { Meta } from '@storybook/react';
import React, { useState } from 'react';

import { Surface } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AIServiceClientImpl, Message, isToolUse, runTools } from '@dxos/assistant';
import { createStatic, ObjectId } from '@dxos/echo-schema';
import { EdgeHttpClient } from '@dxos/edge-client';
import { DXN, QueueSubspaceTags, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { create } from '@dxos/react-client/echo';
import { IconButton, Input, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { useDynamicCallback, useQueue } from './hooks';
import {
  ARTIFACTS_SYSTEM_PROMPT,
  capabilities,
  localServiceEndpoints,
  artifacts,
  type ArtifactsContext,
  genericTools,
  ChessSchema,
} from './testing';
import { Thread } from '../components';

const endpoints = localServiceEndpoints;

type RenderProps = {
  items?: ArtifactsContext['items']; // TODO(burdon): Typedef.
};

const Render = ({ items: _items }: RenderProps) => {
  const [edgeHttpClient] = useState(() => new EdgeHttpClient(endpoints.edge));
  const [aiServiceClient] = useState(() => new AIServiceClientImpl({ endpoint: endpoints.ai }));
  const [isGenerating, setIsGenerating] = useState(false);
  const [queueDxn, setQueueDxn] = useState(() => randomQueueDxn());
  const [artifactsContext] = useState(() =>
    create<ArtifactsContext>({
      items: _items ?? [],
      getArtifacts() {
        return this.items;
      },
      addArtifact(artifact) {
        this.items.push(artifact);
      },
    }),
  );

  const items = artifactsContext.items.toReversed();
  const historyQueue = useQueue<Message>(edgeHttpClient, DXN.parse(queueDxn, true));
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  log.info('items', { items: history });

  const tools = [
    //
    ...genericTools,
    ...artifacts['plugin-chess'].tools,
    ...artifacts['plugin-map'].tools,
  ];

  const handleSubmit = useDynamicCallback(async (message: string) => {
    log.info('handleSubmit', { history });
    if (isGenerating) {
      return;
    }

    // TODO(burdon): Factor out.
    try {
      setIsGenerating(true);
      const history = [...historyQueue.objects];
      const append = (messages: Message[]) => {
        void historyQueue.append(messages);
        history.push(...messages);
      };

      append([
        createStatic(Message, {
          role: 'user',
          content: [{ type: 'text', text: message }],
        }),
      ]);

      generate: while (true) {
        const response = await aiServiceClient.generate({
          model: '@anthropic/claude-3-5-sonnet-20241022',
          systemPrompt: ARTIFACTS_SYSTEM_PROMPT,
          history,
          tools,
        });

        // TODO(dmaretskyi): Have to drain the stream manually.
        queueMicrotask(async () => {
          for await (const event of response) {
            log.info('event', { event });
            setPendingMessages([...response.accumulatedMessages.map((message) => createStatic(Message, message))]);
          }
        });

        const assistantMessages = await response.complete();
        log.info('assistantMessages', { assistantMessages: structuredClone(assistantMessages) });
        append([...assistantMessages.map((m) => createStatic(Message, m))]);
        setPendingMessages([]);

        // Resolve tool use locally.
        if (isToolUse(assistantMessages.at(-1)!)) {
          const reply = await runTools({
            tools,
            message: assistantMessages.at(-1)!,
            context: {
              artifacts: artifactsContext,
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
    <div className='grid grid-cols-2 w-full h-full divide-x divide-separator overflow-hidden'>
      {/* Thread */}
      <div className='flex flex-col gap-4 overflow-hidden'>
        <Toolbar.Root classNames='p-2'>
          <Input.Root>
            <Input.TextInput
              classNames='w-full text-sm px-2 py-1 border rounded'
              type='text'
              spellCheck={false}
              value={queueDxn}
              onChange={(ev) => setQueueDxn(ev.target.value)}
            />
            <IconButton
              iconOnly
              label='Copy'
              icon='ph--copy--regular'
              onClick={() => navigator.clipboard.writeText(queueDxn)}
            />
            <IconButton
              iconOnly
              label='Clear'
              icon='ph--trash--regular'
              onClick={() => {
                setQueueDxn(randomQueueDxn());
              }}
            />
          </Input.Root>
        </Toolbar.Root>

        {/* TODO(burdon): Generates new array on each render. */}
        <Thread
          items={[...historyQueue.objects, ...pendingMessages]}
          isGenerating={isGenerating}
          onSubmit={handleSubmit}
        />
      </div>

      {/* Deck */}
      <div className='overflow-hidden grid grid-rows-[2fr_1fr] divide-y divide-separator'>
        {items.length > 0 && (
          <div className={mx('flex grow overflow-hidden', items.length === 1 && 'row-span-2')}>
            <Surface role='canvas-node' limit={1} data={items[0]} />
          </div>
        )}
        {items.length > 1 && (
          <div className='flex shrink-0 overflow-x-scroll min-h-[200px] divide-x divide-separator'>
            {items.slice(1, 3).map((item, idx) => (
              <Surface key={idx} role='canvas-node' limit={1} data={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const randomQueueDxn = () =>
  new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, SpaceId.random(), ObjectId.random()]).toString();

const meta: Meta<typeof Render> = {
  title: 'plugins/plugin-canvas/artifacts',
  render: Render,
  decorators: [
    //
    withTheme,
    withLayout({ fullscreen: true, tooltips: true }),
    withPluginManager({ capabilities }),
  ],
};

export default meta;

export const Default = {};

export const WithInitialItems = {
  args: {
    items: [
      createStatic(ChessSchema, {
        value: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      }),
    ],
  },
};
