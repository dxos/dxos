//
// Copyright 2025 DXOS.org
//

import { type EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import '@dxos/lit-ui';
import { PublicKey } from '@dxos/keys';
import { random } from '@dxos/random';
import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';
import * as Panel from '@dxos/react-ui/Panel';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { Domino } from '@dxos/ui';
import {
  type PendingTextAnchor,
  PendingTextStreamer,
  type WidgetProps,
  type XmlWidgetRegistry,
  editorPendingTextSink,
  getXmlTextChild,
  pendingText,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { keyToFallback, trim } from '@dxos/util';

import { MarkdownStream, type MarkdownStreamController, type MarkdownStreamProps } from './MarkdownStream.tsx';
import { type TextStreamOptions, textStream } from './testing/index.ts';
import TEXT from './testing/text.md?raw';

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

const ReactWidget = ({ children }: WidgetProps) => {
  return <div className='m-2 p-2 border border-separator rounded'>{getXmlTextChild(children)}</div>;
};

const registry: XmlWidgetRegistry = {
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

type StoryArgs = MarkdownStreamProps & {
  initialContent?: string;
  streamOptions?: TextStreamOptions;
};

const DefaultStory = ({
  initialContent,
  content,
  streamOptions = defaultStreamOptions,
  debug: debugProp,
  ...props
}: StoryArgs) => {
  const [controller, setController] = useState<MarkdownStreamController | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [debug, setDebug] = useState(debugProp);

  useEffect(() => {
    if (initialContent) {
      void controller?.append(initialContent);
    }
  }, [controller, initialContent]);

  useEffect(() => {
    if (!controller || !streaming || !content) {
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
        random.lorem.paragraph(),
        `<dom-widget>${random.lorem.paragraphs(3)}</dom-widget>`,
        random.lorem.paragraph(),
        `<react-widget>${random.lorem.paragraphs(3)}</react-widget>`,
        '',
      ].join('\n'),
    );
  }, [controller]);

  return (
    <Panel.Root data-hue={userHue}>
      <Panel.Header>
        <Toolbar.Root>
          <Button.Root
            disabled={streaming}
            icon='ph--play--regular'
            iconOnly
            label='Start'
            onClick={() => setStreaming(true)}
          />
          <Button.Root
            disabled={!streaming}
            icon='ph--stop--regular'
            iconOnly
            label='Stop'
            onClick={() => setStreaming(false)}
          />
          <Button.Root icon='ph--trash--regular' iconOnly label='Reset' onClick={handleReset} />
          <Button.Root disabled={streaming} icon='ph--plus--regular' iconOnly label='Append' onClick={handleAppend} />
          <Toolbar.Separator variant='gap' />
          <Input.Switch label='Debug' checked={debug} onCheckedChange={({ checked }) => setDebug(checked)} />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <MarkdownStream {...props} debug={debug} ref={setController} />
      </Panel.Body>
    </Panel.Root>
  );
};

/** The selected range, which an insert replaces in place of the story's default target. */
const selectedRange = (view: EditorView): { anchor: number; to: number } | undefined => {
  const { from, to } = view.state.selection.main;
  return from < to ? { anchor: from, to } : undefined;
};

/**
 * Streams a new paragraph, or a correction of a few words, into the middle of the document via the `pendingText`
 * preview, since `typewriter` only paces appends at the end.
 */
const InsertStory = ({ initialContent, debug, ...props }: StoryArgs) => {
  const [controller, setController] = useState<MarkdownStreamController | null>(null);
  const [view, setView] = useState<EditorView | null>(null);
  const [streamer, setStreamer] = useState<PendingTextStreamer | null>(null);

  // MarkdownStream does not expose its view, which the pending-text sink dispatches to.
  const extensions = useMemo(
    () => [
      pendingText(),
      ViewPlugin.define((view) => {
        queueMicrotask(() => setView(view));
        return {};
      }),
    ],
    [],
  );

  useEffect(() => {
    if (initialContent) {
      void controller?.setContent(initialContent);
    }
  }, [controller, initialContent]);

  useEffect(() => () => streamer?.dispose(), [streamer]);

  const stream = useCallback(
    (anchor: PendingTextAnchor, text: string) => {
      if (!view) {
        return;
      }

      const next = new PendingTextStreamer(editorPendingTextSink(view), { mode: 'word', wordIntervalMs: 80 });
      next.start(anchor);
      next.push(text);
      setStreamer(next);
    },
    [view],
  );

  const handleInsertParagraph = useCallback(() => {
    if (!view) {
      return;
    }

    const text = random.lorem.paragraph(5);
    const selection = selectedRange(view);
    if (selection) {
      stream({ ...selection, layout: 'paragraph' }, text);
      return;
    }

    // The first paragraph break past the middle of the document.
    const { doc } = view.state;
    let line = doc.lineAt(Math.floor(doc.length / 2));
    while (line.length > 0 && line.number < doc.lines) {
      line = doc.line(line.number + 1);
    }
    stream({ anchor: line.from, layout: 'paragraph' }, text);
  }, [view, stream]);

  const handleInsertCorrection = useCallback(() => {
    if (!view) {
      return;
    }

    const text = random.lorem.words(4);
    const selection = selectedRange(view);
    if (selection) {
      stream({ ...selection, layout: 'inline' }, text);
      return;
    }

    // A few words in the middle of the first prose line past the middle of the document.
    const { doc } = view.state;
    for (let number = doc.lineAt(Math.floor(doc.length / 2)).number; number <= doc.lines; number++) {
      const line = doc.line(number);
      const words = [...line.text.matchAll(/[A-Za-z]+/g)];
      if (/^[A-Za-z]/.test(line.text) && words.length >= 8) {
        const [first, last] = [words[3], words[5]];
        const from = line.from + first.index;
        stream({ anchor: from, to: line.from + last.index + last[0].length, layout: 'inline' }, text);
        return;
      }
    }
  }, [view, stream]);

  return (
    <Panel.Root data-hue={userHue}>
      <Panel.Header>
        <Toolbar.Root>
          <Button.Root
            disabled={!view}
            icon='ph--paragraph--regular'
            iconOnly
            label='Insert paragraph'
            onClick={handleInsertParagraph}
          />
          <Button.Root
            disabled={!view}
            icon='ph--pencil-simple-line--regular'
            iconOnly
            label='Insert correction'
            onClick={handleInsertCorrection}
          />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <MarkdownStream {...props} debug={debug} extensions={extensions} ref={setController} />
      </Panel.Body>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-markdown/MarkdownStream',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialContent: TEXT,
    options: {
      autoScroll: true,
    },
  },
};

export const Streaming: Story = {
  args: {
    registry,
    content: TEXT,
    options: {
      autoScroll: true,
      typewriter: true,
      fader: true,
      cursor: true,
    },
  },
};

export const Widgets: Story = {
  args: {
    registry,
    initialContent: trim`
      # DOM Widget
      <dom-widget>${random.lorem.paragraph()}</dom-widget>

      # React Widget
      <react-widget>${random.lorem.paragraph()}</react-widget>
    `,
  },
};

export const Insert: Story = {
  render: InsertStory,
  args: {
    initialContent: TEXT,
  },
};
