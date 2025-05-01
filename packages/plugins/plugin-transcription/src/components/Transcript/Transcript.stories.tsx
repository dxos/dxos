//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useState, useMemo, type FC } from 'react';

import { contributes, Capabilities, SettingsPlugin, IntentPlugin, createSurface } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { getSchema } from '@dxos/echo-schema';
import { ClientPlugin } from '@dxos/plugin-client';
import { SpacePlugin } from '@dxos/plugin-space';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { useSpace } from '@dxos/react-client/echo';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { defaultTx } from '@dxos/react-ui-theme';
import { withLayout } from '@dxos/storybook-utils';

import { Transcript, type TranscriptProps, renderMarkdown } from './Transcript';
import { BlockBuilder, TestItem, useTestTranscriptionQueue } from './testings';
import { useQueueModelAdapter } from '../../hooks';
import { BlockModel } from '../../model';
import translations from '../../translations';
import { type TranscriptBlock } from '../../types';

faker.seed(1);

/**
 * Story wrapper with test controls.
 */
const TranscriptContainer: FC<
  TranscriptProps & {
    running: boolean;
    onRunningChange: (running: boolean) => void;
    onReset?: () => void;
  }
> = ({ space, model, running, onRunningChange, onReset }) => {
  return (
    <div className='grid grid-rows-[1fr_40px] grow divide-y divide-separator'>
      <Transcript space={space} model={model} />
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

type StoryProps = { blocks?: TranscriptBlock[] } & Pick<TranscriptProps, 'ignoreAttention' | 'attendableId'>;

/**
 * Basic story mutates array of blocks.
 */
const BasicStory = ({ blocks: initialBlocks = [], ...props }: StoryProps) => {
  const [reset, setReset] = useState({});
  const builder = useMemo(() => new BlockBuilder(), []);
  const model = useMemo(() => new BlockModel<TranscriptBlock>(renderMarkdown, initialBlocks), [initialBlocks, reset]);
  const [running, setRunning] = useState(true);
  const [currentBlock, setCurrentBlock] = useState<TranscriptBlock | null>(null);
  useEffect(() => {
    if (!running) {
      return;
    }

    if (!currentBlock) {
      const block = builder.createBlock();
      model.appendBlock(block);
      setCurrentBlock(block);
      return;
    }

    const i = setInterval(() => {
      if (currentBlock?.segments.length && currentBlock.segments.length >= 3) {
        setCurrentBlock(null);
        clearInterval(i);
        return;
      }

      currentBlock.segments.push(builder.createSegment());
      model.updateBlock(currentBlock);
    }, 3_000);

    return () => clearInterval(i);
  }, [model, currentBlock, running]);

  const handleReset = () => {
    setCurrentBlock(null);
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
const QueueStory = ({ blocks: initialBlocks = [], ...props }: StoryProps) => {
  const [running, setRunning] = useState(true);
  const space = useSpace();
  const queue = useTestTranscriptionQueue(space, running, 2_000);
  const model = useQueueModelAdapter(renderMarkdown, queue, initialBlocks);

  return <TranscriptContainer space={space} model={model} running={running} onRunningChange={setRunning} {...props} />;
};

const meta: Meta<StoryProps> = {
  title: 'plugins/plugin-transcription/Transcript',
  decorators: [
    withPluginManager({
      plugins: [
        ThemePlugin({ tx: defaultTx }),
        ClientPlugin({
          types: [TestItem],
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
          },
        }),
        SpacePlugin(),
        SettingsPlugin(),
        IntentPlugin(),
      ],
      capabilities: [
        contributes(
          Capabilities.ReactSurface,
          createSurface({
            id: 'preview-test',
            role: 'preview',
            component: ({ data }) => {
              const schema = getSchema(data);
              if (!schema) {
                return null;
              }

              return <Form schema={schema} values={data} />;
            },
          }),
        ),
      ],
    }),
    withLayout({ tooltips: true, fullscreen: true }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {
  render: BasicStory,
  args: {
    ignoreAttention: true,
    attendableId: 'story',
    blocks: Array.from({ length: 10 }, () => BlockBuilder.singleton.createBlock()),
  },
};

export const Empty: Story = {
  render: BasicStory,
  args: {
    ignoreAttention: true,
    attendableId: 'story',
  },
};

export const WithQueue: Story = {
  render: QueueStory,
  args: {
    ignoreAttention: true,
    attendableId: 'story',
  },
};
