//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState, type CSSProperties } from 'react';

import '@dxos/lit-ui';
import { PublicKey } from '@dxos/keys';
import { random } from '@dxos/random';
import { Input, Toolbar } from '@dxos/react-ui';
import { Panel } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Domino } from '@dxos/ui';
import { getXmlTextChild, type XmlWidgetRegistry } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { keyToFallback, trim } from '@dxos/util';

import { MarkdownStream, type MarkdownStreamController, type MarkdownStreamProps } from './MarkdownStream';
import { type TextStreamOptions, textStream } from './testing';
import TEXT_MIXED from './testing/text-mixed.md?raw';
import TEXT_REASONING from './testing/text-reasoning.md?raw';
import TEXT_WIDGET from './testing/text-widget.md?raw';
import { PromptWidget, ReasoningWidget } from './widgets';

random.seed(123);

const userHue = keyToFallback(PublicKey.random()).hue;

const defaultStreamOptions: TextStreamOptions = {
  wordsPerChunk: 5,
  chunkDelay: 200,
  variance: 0.5,
};

class DOMWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  override eq(other: this) {
    return this.text === other.text;
  }

  override toDOM() {
    return Domino.of('span').classNames(mx('flex m-2 p-2 border border-separator rounded')).text(this.text).root;
  }
}

const ReactWidget = ({ children }: { children: string }) => {
  return <div className='m-2 p-2 border border-separator rounded'>{children}</div>;
};

const registry: XmlWidgetRegistry = {
  prompt: {
    block: true,
    factory: ({ children }) => {
      const text = getXmlTextChild(children);
      return text ? new PromptWidget(text) : null;
    },
  },
  reasoning: {
    block: true,
    streaming: true,
    factory: ({ children, range }) => {
      const text = getXmlTextChild(children);
      return text ? new ReasoningWidget(text, range.from) : null;
    },
  },

  // Custom widgets.

  'dom-widget': {
    block: true,
    streaming: true,
    factory: ({ children }) => {
      const text = getXmlTextChild(children);
      return text ? new DOMWidget(text) : null;
    },
  },
  'react-widget': {
    block: true,
    streaming: true,
    Component: ReactWidget,
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
    void controller?.setContent('');
  }, [controller]);

  const handleAppend = useCallback(() => {
    void controller?.append(
      [
        //
        random.lorem.paragraph(),
        `<react-widget>${random.lorem.paragraphs(3)}</react-widget>`,
        '',
      ].join('\n\n'),
    );
  }, [controller]);

  return (
    <Panel.Root style={{ '--user-fill': `var(--color-${userHue}-fill)` } as CSSProperties}>
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
            <Input.Label classNames='pr-1'>Debug</Input.Label>
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
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    registry: registry,
    content: TEXT_MIXED,
  },
};

export const Wire: Story = {
  args: {
    registry: registry,
    content: TEXT_MIXED,
    options: {
      autoScroll: true,
      wire: true,
      cursor: true,
    },
  },
};

export const Widgets: Story = {
  args: {
    registry: registry,
    initialContent: trim`
      # DOM Widget
      <dom-widget>${random.lorem.paragraph()}</dom-widget>

      # React Widget
      <react-widget>${random.lorem.paragraph()}</react-widget>
    `,
  },
};

export const StreamingWidgets: Story = {
  args: {
    registry: registry,
    content: TEXT_WIDGET,
    options: {
      autoScroll: true,
      wire: true,
      fader: true,
      cursor: true,
    },
  },
};

export const StreamingTags: Story = {
  args: {
    registry: registry,
    content: TEXT_REASONING,
    options: {
      autoScroll: true,
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
      autoScroll: true,
      wire: true,
      fader: true,
      cursor: true,
    },
  },
};

export const AutoScroll: Story = {
  args: {
    initialContent: TEXT_MIXED,
    registry: registry,
    content: TEXT_MIXED,
    options: {
      autoScroll: true,
    },
  },
};

export const Debug: Story = {
  args: {
    initialContent: TEXT_MIXED,
    registry: registry,
    content: TEXT_MIXED,
    debug: true,
  },
};
