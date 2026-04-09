//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type CSSProperties, useCallback, useEffect, useState } from 'react';

// TODO(burdon): Document why this is required.
import '@dxos/lit-ui';
import { PublicKey } from '@dxos/keys';
import { faker } from '@dxos/random';
import { Input, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Domino } from '@dxos/ui';
import { type XmlWidgetRegistry } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { keyToFallback } from '@dxos/util';

import { MarkdownStream, type MarkdownStreamController, type MarkdownStreamProps } from './MarkdownStream';
import { type TextStreamOptions, textStream } from './testing';
import TEXT from './testing/text.md?raw';

// TODO(burdon): Get user hue from identity.
const userHue = keyToFallback(PublicKey.random()).hue;

const defaultStreamOptions: TextStreamOptions = {
  wordsPerChunk: 5,
  chunkDelay: 200,
  variance: 0.5,
};

export class TestWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  override eq(other: this) {
    return this.text === other.text;
  }

  override toDOM() {
    return Domino.of('span').classNames(mx('flex m-2 p-8 border border-separator rounded')).text(this.text).root;
  }
}

const registry: XmlWidgetRegistry = {
  test: {
    block: true,
    factory: (props) => new TestWidget(props.children?.[0]),
  },
};

type DefaultStoryProps = MarkdownStreamProps & { initialContent?: string; streamOptions?: TextStreamOptions };

const DefaultStory = ({
  initialContent,
  content,
  streamOptions = defaultStreamOptions,
  ...props
}: DefaultStoryProps) => {
  const [controller, setController] = useState<MarkdownStreamController | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    if (initialContent) {
      void controller?.append(initialContent);
    }
  }, [controller, initialContent]);

  useEffect(() => {
    if (!controller || !streaming) {
      return;
    }

    let cancelled = false;
    void (async () => {
      for await (const chunk of textStream(content + '\n', streamOptions)) {
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
      [faker.lorem.paragraph(), `<test>${faker.lorem.word()}</test>`, faker.lorem.paragraph()].join('\n'),
    );
  }, [controller]);

  return (
    <div
      className={mx('flex flex-col h-full w-full')}
      style={userHue ? ({ '--user-fill': `var(--color-${userHue}-fill)` } as CSSProperties) : undefined}
    >
      <Toolbar.Root classNames='border-b border-subdued-separator'>
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
        <Toolbar.Separator />
        <Input.Root>
          <Input.Label>Debug</Input.Label>
          <Input.Switch checked={debug} onCheckedChange={setDebug} />
        </Input.Root>
      </Toolbar.Root>
      <MarkdownStream {...props} classNames='w-full overflow-hidden' debug={debug} ref={setController} />
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-components/MarkdownStream',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: TEXT,
    registry: registry,
    fadeIn: true,
    cursor: false,
  },
};

export const WithInitialContent: Story = {
  args: {
    initialContent: TEXT,
    content: TEXT,
    registry: registry,
    fadeIn: true,
    cursor: false,
  },
};
