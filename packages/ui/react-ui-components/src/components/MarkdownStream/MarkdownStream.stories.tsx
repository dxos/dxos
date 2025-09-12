//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';
import '@dxos/lit-ui';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { Toolbar } from '@dxos/react-ui';
import { editorWidth } from '@dxos/react-ui-editor';
import { railGridHorizontal } from '@dxos/react-ui-stack';
import { withLayout, withTheme } from '@dxos/storybook-utils';
import { keyToFallback } from '@dxos/util';

import { useStreamingText } from '../../hooks';

import { MarkdownStream, type MarkdownStreamProps } from './MarkdownStream';
import { type TextStreamOptions, textStream, useTextStream } from './testing';
import doc from './testing/doc.md?raw';

// TODO(burdon): Get user hue from identity.
const userHue = keyToFallback(PublicKey.random()).hue;

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
    <>
      <Toolbar.Root classNames='border-be border-separator'>
        <Toolbar.Button onClick={handleStart} disabled={isStreaming}>
          Start
        </Toolbar.Button>
        <Toolbar.Button onClick={handleReset}>Reset</Toolbar.Button>
      </Toolbar.Root>
      <MarkdownStream
        content={str}
        options={options}
        userHue={userHue}
        classNames='[&_.cm-scroller]:pli-cardSpacingInline [&_.cm-scroller]:plb-cardSpacingBlock min-bs-0'
        // registry={registry}
        // onEvent={(ev) => console.log(ev)}
      />
    </>
  );
};

const meta = {
  title: 'ui/react-ui-components/MarkdownStream',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: ['grid', railGridHorizontal, editorWidth] })],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: doc,
  },
};

export const Streaming: Story = {
  args: {
    content: doc,
    options: {
      autoScroll: true,
      fadeIn: true,
      cursor: true,
    },
  },
};

export const Components = () => {
  return (
    <MarkdownStream
      content={doc}
      userHue={userHue}
      options={{ autoScroll: true }}
      // registry={registry}
      // onEvent={(ev) => console.log(ev)}
    />
  );
};
