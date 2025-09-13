//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';
import '@dxos/lit-ui';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type CSSProperties, useCallback, useEffect, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { Toolbar } from '@dxos/react-ui';
import { editorWidth } from '@dxos/react-ui-editor';
import { railGridHorizontal } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';
import { keyToFallback } from '@dxos/util';

import { faker } from '../../../../../common/random/src';

import { MarkdownStream, type MarkdownStreamController, type MarkdownStreamProps } from './MarkdownStream';
import { type TextStreamOptions, textStream, useTextStream as useTestStream } from './testing';
import doc from './testing/doc.md?raw';

// TODO(burdon): Get user hue from identity.
const userHue = keyToFallback(PublicKey.random()).hue;

const testOptions: TextStreamOptions = {
  chunkDelay: 200,
  variance: 0.5,
  wordsPerChunk: 5,
};

type StoryProps = MarkdownStreamProps & { streamOptions?: TextStreamOptions };

const DefaultStory = ({ content = '', streamOptions = testOptions, ...options }: StoryProps) => {
  const [generator, setGenerator] = useState<AsyncGenerator<string, void, unknown> | null>(null);
  const [text, isStreaming] = useTestStream(generator);

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
    <div
      className={mx('grid is-full', railGridHorizontal)}
      style={userHue ? ({ '--user-fill': `var(--dx-${userHue}Fill)` } as CSSProperties) : undefined}
    >
      <Toolbar.Root classNames='border-be border-separator'>
        <Toolbar.Button disabled={isStreaming} onClick={handleStart}>
          Start
        </Toolbar.Button>
        <Toolbar.Button onClick={handleReset}>Reset</Toolbar.Button>
      </Toolbar.Root>
      <MarkdownStream classNames='is-full overflow-hidden' content={text} {...options} />;
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-components/MarkdownStream',
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
    content: doc,
    fadeIn: true,
    cursor: true,
  },
};

export const Components = () => {
  const [controller, setController] = useState<MarkdownStreamController | null>(null);

  const handleReset = useCallback(() => {
    controller?.update(Array.from({ length: 3 }, () => faker.lorem.paragraph()).join('\n\n'));
  }, [controller]);

  const handleAppend = useCallback(() => {
    controller?.append('\n\n' + faker.lorem.paragraph());
  }, [controller]);

  useEffect(() => {
    handleReset();
  }, [controller]);

  return (
    <div
      className={mx('grid is-full', railGridHorizontal)}
      style={userHue ? ({ '--user-fill': `var(--dx-${userHue}Fill)` } as CSSProperties) : undefined}
    >
      <Toolbar.Root classNames='border-be border-separator'>
        <Toolbar.Button onClick={handleReset}>Reset</Toolbar.Button>
        <Toolbar.Button onClick={handleAppend}>Append</Toolbar.Button>
      </Toolbar.Root>
      <MarkdownStream ref={setController} classNames='is-full overflow-hidden' fadeIn cursor />
    </div>
  );
};
