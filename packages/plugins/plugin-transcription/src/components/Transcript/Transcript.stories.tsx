//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type FC, useEffect, useMemo, useState } from 'react';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Key } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { useMembers, useSpace } from '@dxos/react-client/echo';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { Testing } from '@dxos/schema/testing';

import { useQueueModelAdapter } from '../../hooks';
import { SerializationModel } from '../../model';
import {
  MessageBuilder,
  TestItem,
  useTestTranscriptionQueue,
  useTestTranscriptionQueueWithEntityExtraction,
} from '../../testing';
import { translations } from '../../translations';

import { TranscriptView, type TranscriptViewProps, renderByline } from './Transcript';

faker.seed(1);

/**
 * Story wrapper with test controls.
 */
const TranscriptContainer: FC<
  TranscriptViewProps & {
    running: boolean;
    onRunningChange: (running: boolean) => void;
    onReset?: () => void;
  }
> = ({ space, model, running, onRunningChange, onReset }) => {
  return (
    <div className='grid grid-rows-[1fr_40px] grow divide-y divide-separator'>
      <TranscriptView space={space} model={model} />
      <div className='grid grid-cols-[1fr_16rem] overflow-hidden'>
        <div className='flex items-center'>
          <SyntaxHighlighter language='json' className='text-sm'>
            {JSON.stringify(model.toJSON())}
          </SyntaxHighlighter>
        </div>
        <Toolbar.Root classNames='justify-end'>
          <IconButton
            icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
            label={running ? 'Pause' : 'Start'}
            onClick={() => onRunningChange(!running)}
          />
          {onReset && <IconButton icon='ph--x--regular' label='Reset' onClick={onReset} />}
        </Toolbar.Root>
      </div>
    </div>
  );
};

type StoryProps = { messages?: DataType.Message[] } & Pick<TranscriptViewProps, 'ignoreAttention' | 'attendableId'>;

/**
 * Basic story mutates array of messages.
 */
const BasicStory = ({ messages: initialMessages = [], ...props }: StoryProps) => {
  const [reset, setReset] = useState({});
  const builder = useMemo(() => new MessageBuilder(), []);
  const model = useMemo(
    () => new SerializationModel<DataType.Message>(renderByline([]), initialMessages),
    [initialMessages, reset],
  );
  const [running, setRunning] = useState(true);
  const [currentMessage, setCurrentMessage] = useState<DataType.Message | null>(null);
  useEffect(() => {
    if (!running) {
      return;
    }

    if (!currentMessage) {
      void builder.createMessage().then((message) => {
        model.appendChunk(message);
        setCurrentMessage(message);
      });
      return;
    }

    const i = setInterval(() => {
      if (currentMessage?.blocks.length && currentMessage.blocks.length >= 3) {
        setCurrentMessage(null);
        clearInterval(i);
        return;
      }

      currentMessage.blocks.push(builder.createBlock());
      model.updateChunk(currentMessage);
    }, 3_000);

    return () => clearInterval(i);
  }, [model, currentMessage, running]);

  const handleReset = () => {
    setCurrentMessage(null);
    setRunning(false);
    setReset({});
  };

  return (
    <TranscriptContainer
      model={model}
      running={running}
      onRunningChange={setRunning}
      onReset={handleReset}
      {...props}
    />
  );
};

/**
 * Queue story mutates queue with model adapter.
 */
const QueueStory = ({
  messages: initialMessages = [],
  queueId,
  onReset,
  ...props
}: StoryProps & { queueId: Key.ObjectId; onReset: () => void }) => {
  const [running, setRunning] = useState(true);
  const space = useSpace();
  const members = useMembers(space?.key).map((member) => member.identity);
  const queue = useTestTranscriptionQueue(space, queueId, running, 2_000);
  const model = useQueueModelAdapter(renderByline(members), queue, initialMessages);

  return (
    <TranscriptContainer
      space={space}
      model={model}
      running={running}
      onRunningChange={setRunning}
      onReset={onReset}
      {...props}
    />
  );
};

// TODO(burdon): Reconcile with QueueStory.
const EntityExtractionQueueStory = () => {
  const [running, setRunning] = useState(true);
  const space = useSpace();
  const members = useMembers(space?.key).map((member) => member.identity);
  const queue = useTestTranscriptionQueueWithEntityExtraction(space, undefined, running, 2_000);
  const model = useQueueModelAdapter(renderByline(members), queue, []);

  return <TranscriptContainer space={space} model={model} running={running} onRunningChange={setRunning} />;
};

/**
 * Wrapper remounts on refresh to reload queue.
 */
const QueueStoryWrapper = () => {
  const [queueId] = useState(Key.ObjectId.random());
  const [key, setKey] = useState(Key.ObjectId.random().toString());
  const handleReset = () => {
    setKey(Key.ObjectId.random().toString());
  };

  return <QueueStory key={key} queueId={queueId} onReset={handleReset} />;
};

const meta = {
  title: 'plugins/plugin-transcription/Transcript',
  decorators: [
    withPluginManager({
      plugins: [
        ClientPlugin({
          types: [TestItem, Testing.DocumentType, DataType.Person, DataType.Organization],
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
          },
        }),
        SpacePlugin({}),
        IntentPlugin(),
        SettingsPlugin(),

        // UI
        PreviewPlugin(),
        ThemePlugin({ tx: defaultTx }),
        StorybookLayoutPlugin({}),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof BasicStory> = {
  render: BasicStory,
  args: {
    ignoreAttention: true,
    attendableId: 'story',
    messages: await Promise.all(Array.from({ length: 10 }, () => MessageBuilder.singleton.createMessage())),
  },
};

export const Empty: StoryObj<typeof BasicStory> = {
  render: BasicStory,
  args: {
    ignoreAttention: true,
    attendableId: 'story',
  },
};

export const WithQueue: StoryObj<typeof QueueStoryWrapper> = {
  render: QueueStoryWrapper,
  args: {
    ignoreAttention: true,
    attendableId: 'story',
  },
};

// NOTE: We are running out of free quota on hugging face entity extraction.
// TODO(mykola): Fix AI service in entity extraction function.
// TODO(mykola): Fix hugging face quota issues.
// export const WithEntityExtractionQueue: StoryObj<typeof EntityExtractionQueueStory> = {
//   render: EntityExtractionQueueStory,
//   args: {
//     ignoreAttention: true,
//     attendableId: 'story',
//   },
// };
