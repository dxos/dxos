//
// Copyright 2026 DXOS.org
//

import {
  type ChatModelAdapter,
  AssistantRuntimeProvider,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
} from '@assistant-ui/react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

/**
 * Storybook demo for streaming assistant text using [assistant-ui](https://github.com/assistant-ui/assistant-ui).
 * Uses `useLocalRuntime` with a streaming `ChatModelAdapter` (async generator) — no backend required.
 *
 * @see https://www.assistant-ui.com/docs/runtimes/custom/local
 */
const streamingDemoAdapter: ChatModelAdapter = {
  async *run({ abortSignal }) {
    const segments = [
      '# Streaming reply\n\n',
      'This response is **streamed** with ',
      '`ChatModelAdapter` ',
      'and `useLocalRuntime`.\n\n',
      '- Chunked updates\n',
      '- Markdown-style text\n',
      '- Cancel via the composer when supported\n',
    ];

    let text = '';
    for (const segment of segments) {
      for (const chunk of segment.split(/(\s+)/)) {
        if (chunk.length === 0) {
          continue;
        }
        if (abortSignal.aborted) {
          return;
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 38));
        text += chunk;
        yield {
          content: [{ type: 'text', text }],
        };
      }
    }
  },
};

/**
 * `MessagePrimitive.Parts` must either be omitted (default text/image rendering) or receive a
 * render function `(partAccessor) => ReactNode` — not JSX children. See MessageParts in
 * @assistant-ui/core.
 */
const UserMessage = () => (
  <MessagePrimitive.Root
    className={mx('self-end rounded-lg bg-neutral-200 px-3 py-2 dark:bg-neutral-700')}
  >
    <MessagePrimitive.Parts />
  </MessagePrimitive.Root>
);

const AssistantMessage = () => (
  <MessagePrimitive.Root
    className={mx('self-start rounded-lg border border-subdued-separator bg-background px-3 py-2')}
  >
    <MessagePrimitive.Parts />
  </MessagePrimitive.Root>
);

const AssistantUiThread = () => (
  <ThreadPrimitive.Root
    className={mx('dx-container flex h-full min-h-0 flex-1 flex-col border')}
  >
    {/*
      Only messages scroll inside ThreadPrimitive.Viewport. Composer + scroll affordance sit below
      in a shrink-0 bar so the input stays fixed at the bottom of the panel.
      The viewport root must stay the scroll container (no nested overflow-y) for scrollToBottom.
    */}
    <ThreadPrimitive.Viewport
      autoScroll
      className={mx('relative dx-container min-h-0 flex-1 overflow-y-auto')}
    >
      <AuiIf condition={(state) => !state.thread || state.thread.isEmpty}>
        <p className={mx('text-description')}>
          Send a message — the assistant reply streams in using assistant-ui primitives.
        </p>
      </AuiIf>

      <ThreadPrimitive.Messages
        components={{
          UserMessage,
          AssistantMessage,
        }}
      />
    </ThreadPrimitive.Viewport>

    <div
      className={mx(
        'flex shrink-0 flex-col gap-2 border-t border-subdued-separator bg-background px-1 py-2',
      )}
    >
      <ThreadPrimitive.ScrollToBottom className={mx('self-end rounded border px-2 py-1 text-xs')}>
        Scroll to bottom
      </ThreadPrimitive.ScrollToBottom>
      <ComposerPrimitive.Root className={mx('flex gap-2')}>
        <ComposerPrimitive.Input
          className={mx(
            'min-h-[40px] flex-1 resize-none rounded-md border border-input bg-background px-2 py-1 text-sm',
          )}
          placeholder='Message…'
        />
        <ComposerPrimitive.Send className={mx('rounded-md border border-input px-3 py-1 text-sm')}>
          Send
        </ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    </div>
  </ThreadPrimitive.Root>
);

const DefaultStory = () => {
  const runtime = useLocalRuntime(streamingDemoAdapter);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className={mx('flex h-full min-h-0 w-full flex-col')}>
        <AssistantUiThread />
      </div>
    </AssistantRuntimeProvider>
  );
};

const meta = {
  title: 'ui/react-ui-components/Assistant',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
