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
import { keyToFallback } from '@dxos/util';

import { translations } from '../../translations';
import { componentRegistry } from './registry';
import THREAD_1 from './testing/thread-1.md?raw';

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
  title: 'plugins/plugin-assistant/components/ChatStream',
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

export const Debug: Story = {
  args: {
    initialContent: THREAD_1,
    registry: componentRegistry,
    content: THREAD_1,
    debug: true,
  },
};
