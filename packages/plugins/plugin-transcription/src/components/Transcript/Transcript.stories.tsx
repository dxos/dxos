//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useState, useMemo } from 'react';

import { create, ObjectId } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { useQueue } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { IconButton, Toolbar, useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createRenderer,
  createThemeExtensions,
  decorateMarkdown,
  editorWidth,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { hues, mx } from '@dxos/react-ui-theme';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Transcript } from './Transcript';
import { BlockModel } from './model';
import { blockToMarkdown, transcript } from './transcript-extension';
import translations from '../../translations';
import { TranscriptBlock } from '../../types';
import { randomQueueDxn } from '../../util';

faker.seed(1);

// TODO(burdon): Story with queue.
// TODO(burdon): Create adapter that listens for updates to the queue.

let start = new Date(Date.now() - 24 * 60 * 60 * 10_000);
const next = () => {
  start = new Date(start.getTime() + Math.random() * 10_000);
  return start;
};

const users = Array.from({ length: 5 }, () => ({
  authorName: faker.person.fullName(),
  authorHue: faker.helpers.arrayElement(hues),
}));

const createBlock = (numSegments = 1): TranscriptBlock => ({
  id: ObjectId.random().toString(),
  ...faker.helpers.arrayElement(users),
  segments: Array.from({ length: numSegments }).map(() => createSegment()),
});

const createSegment = () => ({
  started: next(),
  text: faker.lorem.paragraph(),
});

const useTestTranscriptionQueue = (running = true, interval = 1_000) => {
  const queueDxn = useMemo(() => randomQueueDxn(), []);
  const queue = useQueue<TranscriptBlock>(queueDxn);
  useEffect(() => {
    if (!queue || !running) {
      return;
    }

    const i = setInterval(() => queue.append([create(TranscriptBlock, createBlock())]), interval);
    return () => clearInterval(i);
  }, [queue, running, interval]);
  return queue;
};

const QueueStory = () => {
  const queue = useTestTranscriptionQueue();
  return <div>{JSON.stringify(queue?.items.length)}</div>;
};

const ExtensionStory = ({ blocks = 5 }: { blocks?: number }) => {
  const { themeMode } = useThemeContext();
  const [reset, setReset] = useState({});
  const model = useMemo(
    () => new BlockModel<TranscriptBlock>(blockToMarkdown, Array.from({ length: blocks }, createBlock)),
    [blocks, reset],
  );

  const [running, setRunning] = useState(true);
  const [currentBlock, setCurrentBlock] = useState<TranscriptBlock | null>(null);
  useEffect(() => {
    if (!running) {
      return;
    }

    if (!currentBlock) {
      const block = createBlock();
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

      currentBlock.segments.push(createSegment());
      model.updateBlock(currentBlock);
    }, 3_000);

    return () => clearInterval(i);
  }, [model, currentBlock, running]);

  const { parentRef } = useTextEditor(() => {
    return {
      extensions: [
        // TODO(burdon): Enable preview.
        createBasicExtensions({ readOnly: true, lineWrapping: true }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode }),
        decorateMarkdown(),
        transcript({
          model,
          renderButton: createRenderer(({ onClick }) => (
            <IconButton icon='ph--arrow-line-down--regular' iconOnly label='Scroll to bottom' onClick={onClick} />
          )),
        }),
      ],
    };
  }, [model]);

  const handleReset = () => {
    setCurrentBlock(null);
    setRunning(false);
    setReset({});
  };

  return (
    <div className='grid grid-rows-[1fr_40px] grow divide-y divide-separator'>
      <div ref={parentRef} className={mx('flex grow overflow-hidden', editorWidth)} />
      <div className='grid grid-cols-[16rem_1fr_16rem] overflow-hidden'>
        <Toolbar.Root>
          <IconButton
            icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
            label={running ? 'Pause' : 'Start'}
            onClick={() => setRunning(!running)}
          />
          <IconButton icon='ph--x--regular' label='Reset' onClick={handleReset} />
        </Toolbar.Root>
        <div className='flex items-center justify-center'>
          <SyntaxHighlighter language='json' className='text-sm'>
            {JSON.stringify(model.toJSON())}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
};

const meta: Meta<typeof Transcript> = {
  title: 'plugins/plugin-transcription/Transcript',
  component: Transcript,
  render: ({ blocks: initialBlocks = [], ...args }) => {
    const [blocks, setBlocks] = useState(initialBlocks);
    useEffect(() => {
      const i = setInterval(() => setBlocks((blocks) => [...blocks, createBlock()]), 1_000);
      return () => clearInterval(i);
    }, []);

    return <Transcript {...args} blocks={blocks} />;
  },
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true }),
    withLayout({ tooltips: true, fullscreen: true }),
    withTheme,
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof Transcript>;

export const Default: Story = {
  args: {
    ignoreAttention: true,
    attendableId: 'story',
    blocks: Array.from({ length: 10 }, createBlock),
  },
};

export const Empty: Story = {
  args: {
    ignoreAttention: true,
    attendableId: 'story',
  },
};

export const Extension: Story = {
  render: () => <ExtensionStory />,
  args: {
    ignoreAttention: true,
    attendableId: 'story',
  },
};
