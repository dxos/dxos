//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useState, useMemo } from 'react';

import { ObjectId } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { Button, IconButton, useThemeContext } from '@dxos/react-ui';
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
<<<<<<< HEAD
import { transcript, TranscriptModel } from './transcript-extension';
=======
import { BlockModel } from './model';
import { blockToMarkdown, transcript } from './transcript-extension';
>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093
import translations from '../../translations';
import { type TranscriptBlock } from '../../types';

faker.seed(1);
<<<<<<< HEAD
=======

// TODO(burdon): Story with queue.
// TODO(burdon): Create adapter that listens for updates to the queue.
>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093

let start = new Date(Date.now() - 24 * 60 * 60 * 10_000);
const next = () => {
  start = new Date(start.getTime() + Math.random() * 10_000);
  return start;
};

const users = Array.from({ length: 5 }, () => ({
  authorName: faker.person.fullName(),
  authorHue: faker.helpers.arrayElement(hues),
}));

<<<<<<< HEAD
let count = 0;
const createBlock = (numSegments = 1): TranscriptBlock => {
  const author = faker.helpers.arrayElement(users);
  return {
    id: `block-${count++}`,
    // id: ObjectId.random().toString(),
    ...author,
    segments: Array.from({ length: numSegments }).map(() => createSegment()),
  };
};

const createSegment = () => {
  return {
    started: next(),
    text: faker.lorem.word(),
  };
};
=======
const createBlock = (numSegments = 1): TranscriptBlock => ({
  id: ObjectId.random().toString(),
  ...faker.helpers.arrayElement(users),
  segments: Array.from({ length: numSegments }).map(() => createSegment()),
});

const createSegment = () => ({
  started: next(),
  text: faker.lorem.paragraph(),
});
>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093

const meta: Meta<typeof Transcript> = {
  title: 'plugins/plugin-transcription/Transcript',
  component: Transcript,
  render: ({ blocks: initialBlocks = [], ...args }) => {
    const [blocks, setBlocks] = useState(initialBlocks);
    useEffect(() => {
<<<<<<< HEAD
      // TODO(burdon): Add segments.
      const i = setInterval(() => {
        setBlocks((blocks) => [...blocks, createBlock()]);
      }, 1_000);

=======
      const i = setInterval(() => setBlocks((blocks) => [...blocks, createBlock()]), 1_000);
>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093
      return () => clearInterval(i);
    }, []);

    return <Transcript {...args} blocks={blocks} />;
  },
  decorators: [withTheme, withLayout({ tooltips: true, fullscreen: true })],
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

const ExtensionStory = () => {
  const { themeMode } = useThemeContext();
<<<<<<< HEAD
  const model = useMemo(() => new TranscriptModel(Array.from({ length: 3 }, createBlock)), []);
  useEffect(() => {
    console.log('####');
  }, [model]);
  const [running, setRunning] = useState(true);
  const [, refresh] = useState({});

=======
  const model = useMemo(
    () => new BlockModel<TranscriptBlock>(blockToMarkdown, Array.from({ length: 5 }, createBlock)),
    [],
  );
  const [running, setRunning] = useState(true);
>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093
  const [currentBlock, setCurrentBlock] = useState<TranscriptBlock | null>(null);
  useEffect(() => {
    if (!running) {
      return;
    }

    if (!currentBlock) {
<<<<<<< HEAD
      const block = createBlock(1);
      // TODO(burdon): Race condition.
      // TODO(burdon): Wrap queue and flush.
      const i = setTimeout(() => {
        model.setBlock(block);
      }, 1_000);
      setCurrentBlock(block);
      return () => clearTimeout(i);
    }

    return;
    const i = setInterval(() => {
      if (currentBlock.segments.length >= 3) {
=======
      const block = createBlock();
      model.appendBlock(block);
      setCurrentBlock(block);
      return;
    }

    const i = setInterval(() => {
      if (currentBlock?.segments.length && currentBlock.segments.length >= 3) {
>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093
        setCurrentBlock(null);
        clearInterval(i);
        return;
      }

      currentBlock.segments.push(createSegment());
<<<<<<< HEAD
      model.setBlock(currentBlock);
      refresh({});
    }, 10_000);
=======
      model.updateBlock(currentBlock);
    }, 3_000);
>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093

    return () => clearInterval(i);
  }, [model, currentBlock, running]);

<<<<<<< HEAD
  const doc = useMemo(() => model.doc, [model]);
  const { parentRef } = useTextEditor({
    doc,
    // scrollTo: doc.length,
    extensions: [
      // TODO(burdon): Enable preview.
      createBasicExtensions({ readOnly: true, lineWrapping: false }),
      createMarkdownExtensions({ themeMode }),
      createThemeExtensions({ themeMode, slots: { editor: { className: '' } } }),
=======
  const { parentRef } = useTextEditor({
    extensions: [
      // TODO(burdon): Enable preview.
      createBasicExtensions({ readOnly: true, lineWrapping: true }),
      createMarkdownExtensions({ themeMode }),
      createThemeExtensions({ themeMode }),
>>>>>>> 85b36d18db1a6e80897e80aa383ed71629042093
      decorateMarkdown(),
      transcript({
        model,
        renderButton: createRenderer(({ onClick }) => (
          <IconButton icon='ph--arrow-line-down--regular' iconOnly label='Scroll to bottom' onClick={onClick} />
        )),
      }),
    ],
  });

  return (
    <div className='grid grid-rows-[1fr_40px] grow divide-y divide-separator'>
      <div ref={parentRef} className={mx('flex grow overflow-hidden', editorWidth)} />
      <div className='grid grid-cols-[8rem_1fr_8rem] overflow-hidden'>
        <div className='flex items-center p-1'>
          <Button onClick={() => setRunning(!running)}>{running ? 'Stop' : 'Start'}</Button>
        </div>
        <div className='flex items-center justify-center'>
          <SyntaxHighlighter language='json' className='text-sm'>
            {JSON.stringify(model.toJSON())}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
};

export const Extension: Story = {
  render: () => <ExtensionStory />,
  args: {
    ignoreAttention: true,
    attendableId: 'story',
  },
};
