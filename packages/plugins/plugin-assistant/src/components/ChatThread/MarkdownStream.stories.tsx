//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState, type CSSProperties } from 'react';

import '@dxos/lit-ui';
import { PublicKey } from '@dxos/keys';
import { random } from '@dxos/random';
import { Input, Toolbar } from '@dxos/react-ui';
import { Panel } from '@dxos/react-ui';
import {
  MarkdownStream,
  type MarkdownStreamController,
  type MarkdownStreamProps,
  textStream,
} from '@dxos/react-ui-components';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type ContentBlock } from '@dxos/types';
import { keyToFallback } from '@dxos/util';

import { translations } from '../../translations';
import { componentRegistry } from './registry';
import THINKING from './testing/thinking.md?raw';
import THREAD_1 from './testing/thread-1.md?raw';
import THREAD_WIDGETS from './testing/thread-widgets.md?raw';

random.seed(123);

const userHue = keyToFallback(PublicKey.random()).hue;

type TextStreamOptions = {
  wordsPerChunk?: number;
  chunkDelay?: number;
  variance?: number;
};

const defaultStreamOptions: TextStreamOptions = {
  wordsPerChunk: 5,
  chunkDelay: 200,
  variance: 0.5,
};

/** Matches self-closing tool call tags in assistant markdown fixtures (e.g. thinking.md). */
const TOOL_CALL_MARKUP_REGEX = /<toolCall\s+id="([^"]+)"\s*\/>/g;

const extractToolCallIdsFromMarkdown = (markdown: string): string[] =>
  [...markdown.matchAll(TOOL_CALL_MARKUP_REGEX)].map((match) => match[1]);

const SAMPLE_TOOL_NAMES = [
  'get_project_rules',
  'list_mailboxes',
  'query_inbox',
  'enable_blueprint',
  'create_schema',
  'create_project',
  'retry_operation',
] as const;

const sampleCallAndResultBlocks = (toolCallId: string, index: number): ContentBlock.Any[] => {
  const name = SAMPLE_TOOL_NAMES[index % SAMPLE_TOOL_NAMES.length];
  const input = JSON.stringify({ step: index + 1, tool: name });
  const result = JSON.stringify({ ok: true, detail: `Sample result for ${name}.` });
  return [
    { _tag: 'toolCall', toolCallId, name, input, providerExecuted: false },
    { _tag: 'toolResult', toolCallId, name, result, providerExecuted: false },
  ];
};

type DefaultStoryProps = MarkdownStreamProps & {
  initialContent?: string;
  streamOptions?: TextStreamOptions;
  /**
   * When true, after loading `initialContent`, finds `<toolCall id="..." />` ids via
   * {@link TOOL_CALL_MARKUP_REGEX} and seeds each portal widget with paired toolCall + toolResult blocks.
   */
  seedToolWidgetsFromMarkdown?: boolean;
};

const DefaultStory = ({
  initialContent,
  content,
  streamOptions = defaultStreamOptions,
  debug: debugProp,
  seedToolWidgetsFromMarkdown = false,
  ...props
}: DefaultStoryProps) => {
  const [controller, setController] = useState<MarkdownStreamController | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [debug, setDebug] = useState(debugProp);

  useEffect(() => {
    if (!controller || !initialContent) {
      return;
    }

    let cancelled = false;
    void (async () => {
      await controller.append(initialContent);
      if (cancelled || !seedToolWidgetsFromMarkdown) {
        return;
      }

      const toolCallIds = extractToolCallIdsFromMarkdown(initialContent);
      toolCallIds.forEach((toolCallId, index) => {
        controller.updateWidget(toolCallId, {
          blocks: sampleCallAndResultBlocks(toolCallId, index),
        });
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [controller, initialContent, seedToolWidgetsFromMarkdown]);

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
  title: 'plugins/plugin-assistant/components/MarkdownStream',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    registry: componentRegistry,
    initialContent: THREAD_1,
    options: {
      autoScroll: true,
    },
  },
};

export const Streaming: Story = {
  args: {
    registry: componentRegistry,
    content: THREAD_1,
    options: {
      autoScroll: true,
      wire: true,
      cursor: true,
    },
  },
};

export const Widgets: Story = {
  args: {
    registry: componentRegistry,
    initialContent: THREAD_WIDGETS,
    options: {
      autoScroll: true,
    },
  },
};

export const Debug: Story = {
  args: {
    initialContent: THREAD_1,
    registry: componentRegistry,
    content: THREAD_1,
    debug: true,
  },
};

export const Thinking: Story = {
  args: {
    initialContent: THINKING,
    registry: componentRegistry,
    seedToolWidgetsFromMarkdown: true,
    options: {
      autoScroll: true,
    },
  },
};
