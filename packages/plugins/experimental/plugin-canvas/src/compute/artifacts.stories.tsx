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
import { IconButton, Input } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { useDynamicCallback, useQueue } from './hooks';
import {
  ARTIFACTS_SYSTEM_PROMPT,
  capabilities,
  localServiceEndpoints,
  artifacts,
  type ArtifactsContext,
} from './testing';
import { Thread } from '../components';

const endpoints = localServiceEndpoints;

const Render = () => {
  const [edgeHttpClient] = useState(() => new EdgeHttpClient(endpoints.edge));
  const [aiServiceClient] = useState(() => new AIServiceClientImpl({ endpoint: endpoints.ai }));
  const [isGenerating, setIsGenerating] = useState(false);
  const [queueDxn, setQueueDxn] = useState(() => randomQueueDxn());
  const [artifactsContext] = useState(() =>
    create<ArtifactsContext>({
      items: [
        // createStatic(ChessSchema, {
        //   value: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        // }),
      ],
      getArtifacts() {
        return this.items;
      },
      addArtifact(artifact) {
        this.items.push(artifact);
      },
    }),
  );

  const historyQueue = useQueue<Message>(edgeHttpClient, DXN.parse(queueDxn, true));

  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  log.info('items', { items: history });

  const tools = [...artifacts['plugin-chess'].tools, ...artifacts['plugin-map'].tools];

  const handleSubmit = useDynamicCallback(async (message: string) => {
    log.info('handleSubmit', { history });
    if (isGenerating) {
      return;
    }

    try {
      setIsGenerating(true);

      const history = [...historyQueue.objects];
      const append = (msgs: Message[]) => {
        void historyQueue.append(msgs);
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
          tools,
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

  const items = artifactsContext.items.toReversed();

  return (
    <div className='grid grid-cols-2 w-full h-full divide-x divide-separator overflow-hidden'>
      <div className='flex flex-col gap-4 overflow-hidden'>
        <div className='flex gap-2 items-center p-4'>
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
        </div>

        <Thread
          items={[...historyQueue.objects, ...pendingMessages]}
          isGenerating={isGenerating}
          onSubmit={handleSubmit}
        />
      </div>
      <div className='p-4 overflow-hidden flex flex-col gap-4'>
        {items.length > 0 && (
          <div className='flex grow overflow-hidden'>
            <Surface role='canvas-node' limit={1} data={items[0]} />
          </div>
        )}
        {items.length > 1 && (
          <div className='flex shrink-0gap-4 overflow-x-scroll min-h-[200px]'>
            {items.slice(1).map((item, idx) => (
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
