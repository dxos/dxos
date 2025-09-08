//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState } from 'react';

import { Toolbar } from '@dxos/react-ui';
import { ColumnContainer, withLayout, withTheme } from '@dxos/storybook-utils';

import { useStreamingText } from '../../hooks';

import { type StreamingOptions, streamWords, useStreamingGenerator } from './testing';
import content from './testing/short.md?raw';
import { Markdown } from './Typewriter';

const DefaultStory = ({ stream = false, ...options }: StreamingOptions & { stream?: boolean }) => {
  const [generator, setGenerator] = useState<AsyncGenerator<string, void, unknown> | null>(null);
  const [text, isStreaming] = useStreamingGenerator(generator);
  const [str] = useStreamingText(text, 5);

  const handleStart = useCallback(() => {
    setGenerator(streamWords(content, options));
  }, []);

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
        <Markdown content={stream ? str : text} options={{ autoScroll: true, fadeIn: true, cursor: true }} />
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-components/Typewriter',
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
    chunkDelay: 300,
    variance: 0.5,
    wordsPerChunk: 5,
  },
};

export const Streaming: Story = {
  args: {
    stream: true,
    chunkDelay: 300,
    variance: 0.5,
    wordsPerChunk: 5,
  },
};

export const Components = () => {
  return <Markdown content={content} options={{ autoScroll: true, fadeIn: true, cursor: true }} />;
};
