//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useState, useMemo, type FC } from 'react';

import { create, ObjectId } from '@dxos/echo-schema';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { faker } from '@dxos/random';
import { resolveRef, useClient } from '@dxos/react-client';
import { type Queue, type Space, useQueue, useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { IconButton, Toolbar, useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createRenderer,
  createThemeExtensions,
  decorateMarkdown,
  editorWidth,
  preview,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { hues, mx } from '@dxos/react-ui-theme';
import { withTheme, withLayout } from '@dxos/storybook-utils';
import { isNotFalsy } from '@dxos/util';

import { Transcript } from './Transcript';
import { BlockModel } from './model';
import { blockToMarkdown, transcript } from './transcript-extension';
import translations from '../../translations';
import { TranscriptBlock } from '../../types';

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

/**
 * Test transcriptionqueue.
 */
const useTestTranscriptionQueue = (space: Space | undefined, running = true, interval = 1_000) => {
  const queueDxn = useMemo(
    () => (space ? new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, space.id, ObjectId.random()]) : undefined),
    [space],
  );
  const queue = useQueue<TranscriptBlock>(queueDxn);

  useEffect(() => {
    if (!queue || !running) {
      return;
    }

    const i = setInterval(
      () => queue.append([create(TranscriptBlock, createBlock(Math.ceil(Math.random() * 3)))]),
      interval,
    );
    return () => clearInterval(i);
  }, [queue, running, interval]);

  return queue;
};

/**
 * Model adapter for a queue.
 */
const useQueueModel = (queue: Queue<TranscriptBlock> | undefined) => {
  const model = useMemo(() => new BlockModel<TranscriptBlock>(blockToMarkdown), [queue]);
  useEffect(() => {
    if (!queue?.items.length) {
      return;
    }

    const block = queue.items[queue.items.length - 1];
    model.appendBlock(block);
  }, [model, queue?.items.length]);
  return model;
};

const Editor: FC<{
  space?: Space;
  model: BlockModel<TranscriptBlock>;
  running: boolean;
  onRunningChange: (running: boolean) => void;
  onReset?: () => void;
}> = ({ space, model, running, onRunningChange, onReset }) => {
  const client = useClient();
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => {
    return {
      extensions: [
        // TODO(burdon): Enable preview.
        createBasicExtensions({ readOnly: true, lineWrapping: true }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode }),
        decorateMarkdown(),
        space &&
          preview({
            onLookup: async ({ label, ref }) => {
              const dxn = DXN.parse(ref);
              if (!dxn) {
                return null;
              }

              const object = await resolveRef(client, dxn, space);
              return { label, object };
            },
          }),
        transcript({
          model,
          renderButton: createRenderer(({ onClick }) => (
            <IconButton icon='ph--arrow-line-down--regular' iconOnly label='Scroll to bottom' onClick={onClick} />
          )),
        }),
      ].filter(isNotFalsy),
    };
  }, [model]);

  return (
    <div className='grid grid-rows-[1fr_40px] grow divide-y divide-separator'>
      <div ref={parentRef} className={mx('flex grow overflow-hidden', editorWidth)} />
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

const ExtensionStory = ({ blocks = 5 }: { blocks?: number }) => {
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

  const handleReset = () => {
    setCurrentBlock(null);
    setRunning(false);
    setReset({});
  };

  return <Editor model={model} running={running} onRunningChange={setRunning} onReset={handleReset} />;
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

export const WithQueue: Story = {
  render: () => {
    const [running, setRunning] = useState(true);
    const space = useSpace();
    const queue = useTestTranscriptionQueue(space, running, 1_000);
    const model = useQueueModel(queue);
    return <Editor space={space} model={model} running={running} onRunningChange={setRunning} />;
  },
  args: {
    ignoreAttention: true,
    attendableId: 'story',
  },
};
