//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';
import '@dxos/lit-ui';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type CSSProperties, useCallback, useEffect, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { Toolbar } from '@dxos/react-ui';
import {
  type MarkdownStreamProps,
  type TextStreamOptions,
  textStream,
  useMarkdownStream,
  useTextStream,
} from '@dxos/react-ui-components';
import { editorWidth } from '@dxos/react-ui-editor';
import { railGridHorizontal } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';
import { keyToFallback } from '@dxos/util';

import doc from './testing/doc.md?raw';

// TODO(burdon): Get user hue from identity.
const userHue = keyToFallback(PublicKey.random()).hue;

const testOptions: TextStreamOptions = {
  chunkDelay: 200,
  variance: 0.5,
  wordsPerChunk: 5,
};

type StoryProps = MarkdownStreamProps;

const DefaultStory = ({ content = '', ...options }: StoryProps) => {
  const [generator, setGenerator] = useState<AsyncGenerator<string, void, unknown> | null>(null);
  const [text, isStreaming] = useTextStream(generator);
  const { parentRef } = useMarkdownStream({ content: text });

  const handleStart = useCallback(() => {
    setGenerator(textStream(content, testOptions));
  }, [content]);

  const handleReset = useCallback(() => {
    setGenerator(null);
  }, []);

  useEffect(() => {
    handleStart();
  }, []);

  return (
    <div
      className={mx('grid is-full', railGridHorizontal)}
      style={userHue ? ({ '--user-fill': `var(--dx-${userHue}Fill)` } as CSSProperties) : undefined}
    >
      <Toolbar.Root classNames='border-be border-separator'>
        <Toolbar.Button onClick={handleStart} disabled={isStreaming}>
          Start
        </Toolbar.Button>
        <Toolbar.Button onClick={handleReset}>Reset</Toolbar.Button>
      </Toolbar.Root>
      <div ref={parentRef} className='is-full overflow-hidden' />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/ChatStream',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: editorWidth })],
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
    perCharacterDelay: 10,
    content: doc,
    autoScroll: true,
    fadeIn: true,
    cursor: true,
  },
};
