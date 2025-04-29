//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useState, useMemo } from 'react';

import { ObjectId } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { Button, useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  editorWidth,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { hues, mx } from '@dxos/react-ui-theme';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Transcript } from './Transcript';
import { transcript, TranscriptModel } from './transcript-extension';
import translations from '../../translations';
import { type TranscriptBlock } from '../../types';

faker.seed(1);

let start = new Date(Date.now() - 24 * 60 * 60 * 10_000);
const next = () => {
  start = new Date(start.getTime() + Math.random() * 10_000);
  return start;
};

const users = Array.from({ length: 5 }, () => ({
  authorName: faker.person.fullName(),
  authorHue: faker.helpers.arrayElement(hues),
}));

const createBlock = (): TranscriptBlock => {
  const author = faker.helpers.arrayElement(users);
  return {
    id: ObjectId.random().toString(),
    ...author,
    segments: Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => ({
      started: next(),
      text: faker.lorem.paragraph(),
    })),
  };
};

const meta: Meta<typeof Transcript> = {
  title: 'plugins/plugin-transcription/Transcript',
  component: Transcript,
  render: ({ blocks: initialBlocks = [], ...args }) => {
    const [blocks, setBlocks] = useState(initialBlocks);
    useEffect(() => {
      const i = setInterval(() => {
        setBlocks((blocks) => [...blocks, createBlock()]);
      }, 1_000);

      return () => clearInterval(i);
    }, []);

    return <Transcript {...args} blocks={blocks} />;
  },
  decorators: [
    withTheme,
    withLayout({
      tooltips: true,
      fullscreen: true,
    }),
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

const ExtensionStory = () => {
  const { themeMode } = useThemeContext();
  const model = useMemo(() => new TranscriptModel(Array.from({ length: 10 }, createBlock)), []);
  const [running, setRunning] = useState(true);
  const [, refresh] = useState({});

  useEffect(() => {
    if (!running) {
      return;
    }

    const i = setInterval(() => {
      model.addBlock(createBlock(), true);
      refresh({});
    }, 3_000);

    return () => clearInterval(i);
  }, [model, running]);

  const { parentRef } = useTextEditor({
    doc: model.doc,
    extensions: [
      // TODO(burdon): Enable preview.
      createBasicExtensions({ readOnly: true }),
      createMarkdownExtensions({ themeMode }),
      createThemeExtensions({ themeMode, slots: { editor: { className: '' } } }),
      decorateMarkdown(),
      transcript({ model }),
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
