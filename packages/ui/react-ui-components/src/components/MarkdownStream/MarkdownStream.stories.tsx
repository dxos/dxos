//
// Copyright 2025 DXOS.org
//

// TODO(burdon): Document why this is required.
import '@dxos/lit-ui';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type CSSProperties, useCallback, useEffect, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { faker } from '@dxos/random';
import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type XmlWidgetRegistry } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { keyToFallback } from '@dxos/util';

import { MarkdownStream, type MarkdownStreamController, type MarkdownStreamProps } from './MarkdownStream';
import { type TextStreamOptions, textStream } from './testing';
import TEXT from './testing/text.md?raw';
import { SuggestionWidget } from './widgets';

// TODO(burdon): Get user hue from identity.
const userHue = keyToFallback(PublicKey.random()).hue;

const defaultStreamOptions: TextStreamOptions = {
  wordsPerChunk: 5,
  chunkDelay: 200,
  variance: 0.5,
};

const testRegistry: XmlWidgetRegistry = {
  ['suggestion' as const]: {
    block: true,
    factory: (props: any) => new SuggestionWidget(props.children?.[0]),
  },
};

type StoryProps = MarkdownStreamProps & { streamOptions?: TextStreamOptions };

const DefaultStory = ({ content = '', streamOptions = defaultStreamOptions, ...props }: StoryProps) => {
  const [controller, setController] = useState<MarkdownStreamController | null>(null);
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    if (!controller || !streaming) {
      return;
    }

    let cancelled = false;
    void (async () => {
      for await (const chunk of textStream(content, streamOptions)) {
        if (cancelled) {
          break;
        }

        await controller.append(chunk);
      }

      setStreaming(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [controller, content, streaming]);

  const handleReset = useCallback(() => {
    setStreaming(false);
    void controller?.reset('');
  }, [controller]);

  const handleAppend = useCallback(() => {
    void controller?.append(
      [faker.lorem.paragraph(), `<suggestion>${faker.lorem.word()}</suggestion>`, faker.lorem.paragraph(), ''].join(
        '\n\n',
      ),
    );
  }, [controller]);

  return (
    <div
      className={mx('flex flex-col bs-full is-full')}
      style={userHue ? ({ '--user-fill': `var(--dx-${userHue}Fill)` } as CSSProperties) : undefined}
    >
      <Toolbar.Root classNames='border-be border-subduedSeparator'>
        <Toolbar.Button disabled={streaming} onClick={() => setStreaming(true)}>
          Start
        </Toolbar.Button>
        <Toolbar.Button disabled={!streaming} onClick={() => setStreaming(false)}>
          Stop
        </Toolbar.Button>
        <Toolbar.Button onClick={handleReset}>Reset</Toolbar.Button>
        <Toolbar.Button disabled={streaming} onClick={handleAppend}>
          Append
        </Toolbar.Button>
      </Toolbar.Root>
      <MarkdownStream ref={setController} classNames='is-full overflow-hidden' {...props} />
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-markdown/MarkdownStream',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ container: 'column' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: TEXT,
    registry: testRegistry,
    fadeIn: true,
    cursor: false,
  },
};
