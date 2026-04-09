//
// Copyright 2025 DXOS.org
//

import '@dxos/lit-ui';

import { WidgetType } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type CSSProperties, useCallback, useEffect, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { random } from '@dxos/random';
import { Input, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Domino } from '@dxos/ui';
import { Panel } from '@dxos/react-ui';
import { type XmlWidgetRegistry } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { keyToFallback } from '@dxos/util';

import { MarkdownStream, type MarkdownStreamController, type MarkdownStreamProps } from './MarkdownStream';
import { type TextStreamOptions, textStream } from './testing';
import MIXED from './testing/mixed.md?raw';
import TEXT from './testing/text.md?raw';

random.seed(1234);

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

type DefaultStoryProps = MarkdownStreamProps & {
  initialContent?: string;
  streamOptions?: TextStreamOptions;
};

const DefaultStory = ({
  initialContent,
  content,
  streamOptions = defaultStreamOptions,
  debug: debugProp,
  ...props
}: DefaultStoryProps) => {
  const [controller, setController] = useState<MarkdownStreamController | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [debug, setDebug] = useState(debugProp);

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
      [random.lorem.paragraph(), `<test>${random.lorem.word()}</test>`, random.lorem.paragraph()].join('\n'),
    );
  }, [controller]);

  return (
    <Panel.Root
      style={
        userHue
          ? ({
              '--user-fill': `var(--color-${userHue}-fill)`,
            } as CSSProperties)
          : undefined
      }
    >
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.IconButton
            disabled={streaming}
            icon='ph--play--regular'
            iconOnly
            label='Start'
            onClick={() => setStreaming(true)}
          />
          <Toolbar.IconButton
            disabled={!streaming}
            icon='ph--stop--regular'
            iconOnly
            label='Stop'
            onClick={() => setStreaming(false)}
          />
          <Toolbar.IconButton icon='ph--trash--regular' iconOnly label='Reset' onClick={handleReset} />
          <Toolbar.IconButton
            disabled={streaming}
            icon='ph--plus--regular'
            iconOnly
            label='Append'
            onClick={handleAppend}
          />
          <Toolbar.Separator />
          <Input.Root>
            <Input.Label>Debug</Input.Label>
            <Input.Switch checked={debug} onCheckedChange={setDebug} />
          </Input.Root>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <MarkdownStream {...props} debug={debug} ref={setController} />
      </Panel.Content>
    </Panel.Root>
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
    registry: registry,
    content: MIXED,
    options: {
      wire: true,
      cursor: true,
    },
  },
};

export const Text: Story = {
  args: {
    registry: registry,
    content: TEXT,
    options: {
      wire: true,
      fader: true,
      cursor: true,
    },
  },
};

export const Short: Story = {
  args: {
    registry: registry,
    content: random.lorem.paragraph(),
    options: {
      wire: true,
      fader: true,
      cursor: true,
    },
  },
};

export const InitialContent: Story = {
  args: {
    initialContent: MIXED,
    registry: registry,
    content: MIXED,
  },
};

export const Debug: Story = {
  args: {
    initialContent: MIXED,
    registry: registry,
    content: MIXED,
    debug: true,
  },
};
