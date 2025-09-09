//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';
import '@dxos/lit-ui';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState } from 'react';

import { Toolbar } from '@dxos/react-ui';
import { ColumnContainer, withLayout, withTheme } from '@dxos/storybook-utils';

import { useStreamingText } from '../../hooks';

import { MarkdownContent } from './MarkdownContent';
import { MarkdownStream, type MarkdownStreamProps } from './MarkdownStream';
import { type TextStreamOptions, textStream, useTextStream } from './testing';
import doc2 from './testing/doc-2.md?raw';

const testOptions: TextStreamOptions = {
  chunkDelay: 200,
  variance: 0.5,
  wordsPerChunk: 5,
};

type StoryProps = MarkdownStreamProps & { streamOptions?: TextStreamOptions };

const DefaultStory = ({ content = '', options, streamOptions = testOptions }: StoryProps) => {
  const [generator, setGenerator] = useState<AsyncGenerator<string, void, unknown> | null>(null);
  const [text, isStreaming] = useTextStream(generator);
  const [str] = useStreamingText(text, 5);

  const handleStart = useCallback(() => {
    setGenerator(textStream(content, streamOptions));
  }, [content]);

  const handleReset = useCallback(() => {
    setGenerator(null);
  }, []);

  useEffect(() => {
    handleStart();
  }, []);

  return (
    <div className='flex flex-col h-full overflow-hidden gap-4 p-4'>
      <Toolbar.Root>
        <Toolbar.Button onClick={handleStart} disabled={isStreaming}>
          Start
        </Toolbar.Button>
        <Toolbar.Button onClick={handleReset}>Reset</Toolbar.Button>
      </Toolbar.Root>
      <div className='grid grow overflow-hidden'>
        <MarkdownStream content={str} options={options} />
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-components/MarkdownStream',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true, Container: ColumnContainer })],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: doc2,
  },
};

export const Streaming: Story = {
  args: {
    content: doc2,
    options: {
      autoScroll: true,
      fadeIn: true,
      cursor: true,
    },
  },
};

export const Components = () => {
  return <MarkdownContent content={doc2} />;
};
