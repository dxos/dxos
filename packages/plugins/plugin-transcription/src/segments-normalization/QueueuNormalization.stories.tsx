//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useMemo } from 'react';

import { Events, IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { scheduleTask, scheduleTaskInterval } from '@dxos/async';
import { Context } from '@dxos/context';
import { MemoryQueue } from '@dxos/echo-db';
import { create, createQueueDxn } from '@dxos/echo-schema';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { useSpace } from '@dxos/react-client/echo';
import { ScrollContainer } from '@dxos/react-ui-components';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { seedTestData, Testing } from '@dxos/schema/testing';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { getExecutor } from './get-executor';
import { MessageNormalizer } from './message-normalizer';
import { getActorId } from './utils';
import { renderMarkdown, Transcript } from '../components/Transcript';

import { useQueueModelAdapter } from '../hooks/useQueueModelAdapter';

const queueMessages = [
  'I live in',
  'New York',
  'and I regularly enjoy',
  'nice jog in the',
  'Central Park',
  'I would like to',
  'move one day',
  'to a smaller city',
  'like',
  'San Francisco',
  'or',
  'Seattle. It is ',
  'sometimes overwhelming',
  'to live in such fast paced place',
];

const QueueNormalization = ({ llmType }: { llmType: 'local' | 'remote' }) => {
  // Actor.
  const actor = useMemo<DataType.Actor>(() => ({ name: 'John Doe' }), []);

  // Queue.
  const queueDxn = useMemo(() => createQueueDxn(), []);
  const queue = useMemo(() => new MemoryQueue<DataType.Message>(queueDxn), [queueDxn]);
  const space = useSpace();
  const model = useQueueModelAdapter(renderMarkdown([]), queue);

  useEffect(() => {
    const ctx = new Context();
    let index = 0;
    scheduleTaskInterval(
      ctx,
      async () => {
        const message = create(DataType.Message, {
          sender: actor,
          created: new Date().toISOString(),
          blocks: [{ type: 'transcription', text: queueMessages[index++], started: new Date().toISOString() }],
        });
        if (index === queueMessages.length) {
          await ctx.dispose();
        }
        await queue?.append([message]);
      },
      1000,
    );

    return () => {
      void ctx.dispose();
    };
  }, [actor, queue]);

  // Normalizer.
  const normalizer = useMemo<MessageNormalizer>(() => {
    const executor = getExecutor(llmType);
    const normalizer = new MessageNormalizer({
      functionExecutor: executor,
      queue,
      startingCursor: { actorId: getActorId(actor), timestamp: new Date().toISOString() },
    });
    return normalizer;
  }, [llmType, actor, queue]);

  useEffect(() => {
    const ctx = new Context();
    scheduleTask(ctx, async () => {
      await normalizer.open(ctx);
      ctx.onDispose(() => {
        normalizer.close();
      });
    });

    return () => {
      void ctx.dispose();
    };
  }, [queue]);

  return (
    <div className='flex flex-row w-[60rem]'>
      <div className='flex flex-col w-1/2'>
        <ScrollContainer>
          <Transcript space={space} model={model} attendableId='story' />
        </ScrollContainer>
      </div>
      <div className='flex flex-col w-1/2'>
        <ScrollContainer>
          {normalizer.sentences.map((sentence) => (
            <div className='border border-separator rounded px-2 py-1 m-1' key={sentence.segments.join(' ')}>
              segments: {JSON.stringify(sentence.segments)}
              <br />
              sentences: {JSON.stringify(sentence.sentences, null, 2)}
            </div>
          ))}
        </ScrollContainer>
      </div>
    </div>
  );
};

const meta: Meta<typeof QueueNormalization> = {
  title: 'plugins/plugin-transcription/QueueNormalization',
  decorators: [
    withPluginManager({
      plugins: [
        ThemePlugin({ tx: defaultTx }),
        StorybookLayoutPlugin(),
        ClientPlugin({
          types: [DataType.Person, DataType.Organization, DataType.Message],
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
            await client.spaces.waitUntilReady();
            await client.spaces.default.waitUntilReady();
            await seedTestData(client.spaces.default);
          },
        }),
        SpacePlugin(),
        PreviewPlugin(),
      ],
      fireEvents: [Events.SetupAppGraph],
    }),
    withTheme,
    withLayout({ fullscreen: true, classNames: 'justify-center' }),
  ],
};

export default meta;

export const Default: StoryObj<typeof QueueNormalization> = {
  render: QueueNormalization,
  args: {
    llmType: 'remote',
  },
};
