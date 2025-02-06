//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useMemo, useState } from 'react';

import { Capabilities, Surface, useCapabilities } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { type Tool, type Message } from '@dxos/artifact';
import {
  type ArtifactsContext,
  capabilities,
  genericTools,
  type IsObject,
  localServiceEndpoints,
} from '@dxos/artifact-testing';
import { AIServiceClientImpl } from '@dxos/assistant';
import { create } from '@dxos/client/echo';
import { createStatic, ObjectId } from '@dxos/echo-schema';
import { EdgeHttpClient } from '@dxos/edge-client';
import { DXN, QueueSubspaceTags, SpaceId } from '@dxos/keys';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ChessType } from '@dxos/plugin-chess/types';
import { MapPlugin } from '@dxos/plugin-map';
import { useQueue } from '@dxos/react-edge-client';
import { IconButton, Input, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { withLayout, withSignals, withTheme } from '@dxos/storybook-utils';

import { Thread } from './components';
import { ChatProcessor } from './hooks';
import { createProcessorOptions } from './testing';

const endpoints = localServiceEndpoints;

type RenderProps = {
  items?: IsObject[];
};

const Render = ({ items: _items }: RenderProps) => {
  const artifactDefinitions = useCapabilities(Capabilities.ArtifactDefinition);

  // Configuration.
  const tools = useMemo<Tool[]>(
    () => [
      // prettier-ignore
      ...genericTools,
      ...artifactDefinitions.flatMap((definition) => definition.tools),
    ],
    [genericTools, artifactDefinitions],
  );

  // TODO(burdon): Common naming/packaging.
  const [edgeClient] = useState(() => new EdgeHttpClient(endpoints.edge));
  const [aiClient] = useState(() => new AIServiceClientImpl({ endpoint: endpoints.ai }));

  // Queue.
  const [queueDxn, setQueueDxn] = useState(() => randomQueueDxn());
  const queue = useQueue<Message>(edgeClient, DXN.parse(queueDxn, true));

  // Artifacts.
  // TODO(burdon): Factor out class.
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

  // TODO(burdon): Create hook.
  const processor = useMemo(
    () =>
      new ChatProcessor(
        aiClient,
        tools,
        { artifacts: artifactsContext },
        createProcessorOptions(artifactDefinitions.map((definition) => definition.instructions)),
      ),
    [aiClient, tools, artifactsContext, artifactDefinitions],
  );

  // State.
  const artifactItems = artifactsContext.items.toReversed();
  const messages = [...queue.items, ...processor.messages.value];

  const handleSubmit = async (message: string) => {
    // TODO(burdon): Button to cancel. Otherwise queue request.
    if (processor.isStreaming) {
      await processor.cancel();
    }

    const messages = await processor.request(message, queue.items);
    // TODO(burdon): Append on success only? If approved by user? Clinet/server.
    queue.append(messages);
  };

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
              onClick={() => setQueueDxn('')}
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
            <IconButton iconOnly label='Stop' icon='ph--stop--regular' onClick={() => processor.cancel()} />
          </Input.Root>
        </Toolbar.Root>

        <Thread messages={messages} streaming={processor.isStreaming.value} onSubmit={handleSubmit} />
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
    //
    withSignals,
    withTheme,
    withLayout({ fullscreen: true, tooltips: true }),
    withPluginManager({ plugins: [ChessPlugin(), MapPlugin()], capabilities }),
  ],
};

export default meta;

export const Default = {};

export const WithInitialItems = {
  args: {
    items: [
      createStatic(ChessType, {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      }),
    ],
  },
};
