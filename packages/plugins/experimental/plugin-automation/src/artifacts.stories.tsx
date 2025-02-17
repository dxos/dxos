//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Capabilities, IntentPlugin, Surface, useCapabilities, useIntentDispatcher } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Message, type Tool } from '@dxos/artifact';
import {
  capabilities,
  genericTools,
  localServiceEndpoints,
  type ArtifactsContext,
  type IsObject,
} from '@dxos/artifact-testing';
import { AIServiceClientImpl } from '@dxos/assistant';
import { create } from '@dxos/client/echo';
import { createStatic, ObjectId } from '@dxos/echo-schema';
import { EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { DXN, QueueSubspaceTags, SpaceId } from '@dxos/keys';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ChessType } from '@dxos/plugin-chess/types';
import { ClientPlugin } from '@dxos/plugin-client';
import { MapPlugin } from '@dxos/plugin-map';
import { SpacePlugin } from '@dxos/plugin-space';
import { TablePlugin } from '@dxos/plugin-table';
import { useSpace } from '@dxos/react-client/echo';
import { useQueue } from '@dxos/react-edge-client';
import { Button, IconButton, Input, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { withLayout, withSignals, withTheme } from '@dxos/storybook-utils';

import { Thread, type ThreadProps } from './components';
import { ChatProcessor } from './hooks';
import { createProcessorOptions } from './testing';
import translations from './translations';

const endpoints = localServiceEndpoints;

type RenderProps = {
  items?: IsObject[];
  prompts?: string[];
} & Pick<ThreadProps, 'debug'>;

// TODO(burdon): Use ChatContainer.
const Render = ({ items: _items, prompts = [], ...props }: RenderProps) => {
  const space = useSpace();
  const artifactDefinitions = useCapabilities(Capabilities.ArtifactDefinition);
  const tools = useMemo<Tool[]>(
    () => [...genericTools, ...artifactDefinitions.flatMap((definition) => definition.tools)],
    [genericTools, artifactDefinitions],
  );

  const [aiClient] = useState(() => new AIServiceClientImpl({ endpoint: endpoints.ai }));
  const [edgeClient] = useState(() => new EdgeHttpClient(endpoints.edge));
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const processor = useMemo<ChatProcessor | undefined>(() => {
    if (!space) {
      return;
    }

    return new ChatProcessor(
      aiClient,
      tools,
      {
        space,
        dispatch,
      },
      createProcessorOptions(artifactDefinitions.map((definition) => definition.instructions)),
    );
  }, [aiClient, tools, space, dispatch, artifactDefinitions]);

  // Queue.
  const [queueDxn, setQueueDxn] = useState(() => randomQueueDxn());
  const queue = useQueue<Message>(edgeClient, DXN.tryParse(queueDxn));

  useEffect(() => {
    if (queue?.items.length === 0 && !queue.isLoading && prompts.length > 0) {
      queue.append([
        createStatic(Message, {
          role: 'assistant',
          content: prompts.map(
            (prompt) =>
              ({
                type: 'json',
                disposition: 'suggest',
                json: JSON.stringify({ text: prompt }),
              }) as const,
          ),
        }),
      ]);
    }
  }, [queueDxn, prompts, queue?.items.length, queue?.isLoading]);

  // State.
  const artifactItems: any[] = []; // TODO(burdon): Query from space.
  const messages = [...(queue?.items ?? []), ...(processor?.messages.value ?? [])];

  const handleSubmit = processor
    ? async (message: string) => {
        invariant(processor);
        if (processor.streaming.value) {
          await processor.cancel();
        }

        invariant(queue);
        await processor.request(message, {
          history: queue.items,
          onComplete: (messages) => {
            queue.append(messages);
          },
        });
      }
    : undefined;

  const [prompt, setPrompt] = useState(0);
  const handleTest = useCallback(() => {
    void handleSubmit?.(prompts[prompt]);
    setPrompt((prormpt) => (prormpt < prompts.length - 1 ? prormpt + 1 : 0));
  }, [handleSubmit, prompt]);

  const handleSuggest = useCallback(
    (text: string) => {
      void handleSubmit?.(text);
    },
    [handleSubmit],
  );

  return (
    <div className='grid grid-cols-2 w-full h-full divide-x divide-separator overflow-hidden'>
      {/* Thread */}
      <div className='flex flex-col gap-4 overflow-hidden'>
        <Toolbar.Root classNames='p-2'>
          <Input.Root>
            <Input.TextInput
              spellCheck={false}
              placeholder='Queue DXN'
              value={queueDxn}
              // onClick={() => setQueueDxn('')} Why?????
              onChange={(ev) => setQueueDxn(ev.target.value)}
            />
            <IconButton
              iconOnly
              label='Copy DXN'
              icon='ph--copy--regular'
              onClick={() => navigator.clipboard.writeText(queueDxn)}
            />
            <IconButton
              iconOnly
              label='Clear history'
              icon='ph--trash--regular'
              onClick={() => setQueueDxn(randomQueueDxn())}
            />
            <IconButton iconOnly label='Stop' icon='ph--stop--regular' onClick={() => processor?.cancel()} />
          </Input.Root>
        </Toolbar.Root>

        <Thread
          messages={messages}
          streaming={processor?.streaming.value}
          onSubmit={processor ? handleSubmit : undefined}
          onSuggest={processor ? handleSuggest : undefined}
          {...props}
        />
      </div>

      {/* Artifacts Deck/Mosaic */}
      <div className='overflow-hidden grid grid-rows-[2fr_1fr] divide-y divide-separator'>
        {artifactItems.length > 0 && (
          <div className={mx('flex grow overflow-hidden', artifactItems.length === 1 && 'row-span-2')}>
            <Surface role='canvas-node' limit={1} data={artifactItems[0]} />
          </div>
        )}

        {artifactItems.length > 1 && (
          <div className='flex shrink-0 overflow-hidden divide-x divide-separator'>
            <div className='flex flex-1 h-full'>
              {artifactItems.slice(1, 3).map((item, idx) => (
                <Surface key={idx} role='canvas-node' limit={1} data={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const randomQueueDxn = () =>
  new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, SpaceId.random(), ObjectId.random()]).toString();

const meta: Meta<typeof Render> = {
  title: 'plugins/plugin-automation/artifacts',
  render: Render,
  decorators: [
    withSignals,
    withPluginManager({
      plugins: [
        ClientPlugin({
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
          },
        }),
        SpacePlugin({ observability: false }),
        IntentPlugin(),
        ChessPlugin(),
        MapPlugin(),
        TablePlugin(),
      ],
      capabilities,
    }),
    withTheme,
    withLayout({ fullscreen: true, tooltips: true }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof Render>;

export const Default: Story = {
  args: {
    debug: true,
    prompts: ['Ask me a question', 'Show me a chess puzzle'],
  },
};

export const WithInitialItems: Story = {
  args: {
    debug: true,
    items: [
      createStatic(ChessType, {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      }),
    ],
  },
};
