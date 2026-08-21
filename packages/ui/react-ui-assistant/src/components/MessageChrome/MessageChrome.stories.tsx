//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message } from '@dxos/types';

import { translations } from '../../translations';
import { AssistantToolbar, MessageChrome, MessageChromeProvider, PromptToolbar } from './MessageChrome';

/**
 * The per-message frame and the two toolbars it hangs under a row.
 *
 * The toolbars render here without the chrome's hover reveal — they are opacity-0 until the row is
 * under the pointer, so a story that framed them would show an empty box. Rewind and the message id
 * are context, not props: a variant per configuration is a variant per provider.
 */
type StoryArgs = {
  variant: 'prompt-toolbar' | 'assistant-toolbar' | 'prompt' | 'answer';
  rewind?: boolean;
  debug?: boolean;
  selected?: boolean;
  /** Synthetic context riding on the prompt — the selection or event that started the turn. */
  context?: string;
};

const DefaultStory = ({ variant, rewind, debug, selected, context }: StoryArgs) => {
  // Made in a render so the story's `created` is now: the toolbar prints elapsed time.
  const message = useMemo(
    () =>
      Message.make({
        sender:
          variant === 'answer' || variant === 'assistant-toolbar'
            ? { role: 'assistant', name: 'Assistant' }
            : {
                role: 'user',
                name: 'rich',
              },
        blocks: [
          ...(context ? [{ _tag: 'text' as const, text: context, disposition: 'synthetic' as const }] : []),
          {
            _tag: 'text' as const,
            text:
              variant === 'answer' || variant === 'assistant-toolbar'
                ? 'Give every flex ancestor of the scroll viewport `min-h-0`, then put `overflow-y-auto` on the leaf.'
                : 'How do I make a nested flex column scroll instead of growing?',
          },
        ],
      }),
    [variant, context],
  );

  return (
    <MessageChromeProvider onRewind={rewind ? () => {} : undefined} debug={debug}>
      {variant === 'prompt-toolbar' && <PromptToolbar message={message} />}
      {variant === 'assistant-toolbar' && <AssistantToolbar message={message} />}
      {(variant === 'prompt' || variant === 'answer') && (
        // The reveal is the chrome's own: hover the row to bring its toolbar up.
        <MessageChrome message={message} index={0} selected={!!selected} onSelect={() => {}}>
          {/* The renderer's own split: synthetic blocks are the chrome's panel, so the bubble
              frames only the reader's words. */}
          <div className='whitespace-pre-wrap'>
            {message.blocks
              .filter((block) => block._tag === 'text' && block.disposition !== 'synthetic')
              .map((block) => (block as { text: string }).text)
              .join('\n\n')}
          </div>
        </MessageChrome>
      )}
    </MessageChromeProvider>
  );
};

const meta = {
  title: 'ui/react-ui-assistant/components/MessageChrome',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'p-4' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

//
// Toolbars
//

export const Prompt_Toolbar: Story = {
  args: { variant: 'prompt-toolbar', rewind: true },
};

/** Without `onRewind` in context the rewind button is not rendered at all. */
export const Prompt_Toolbar_NoRewind: Story = {
  args: { variant: 'prompt-toolbar' },
};

export const Assistant_Toolbar: Story = {
  args: { variant: 'assistant-toolbar' },
};

/** Debug prints the message id — one turn is several messages, and the id says which. */
export const Toolbar_Debug: Story = {
  args: { variant: 'prompt-toolbar', rewind: true, debug: true },
};

//
// Chrome
//

export const Prompt: Story = {
  args: { variant: 'prompt', rewind: true },
};

export const Prompt_WithContext: Story = {
  args: {
    variant: 'prompt',
    rewind: true,
    context: 'Selection from layout.md:\n\n.panel { display: flex; flex-direction: column; }',
  },
};

export const Answer: Story = {
  args: { variant: 'answer' },
};

export const Selected: Story = {
  args: { variant: 'answer', selected: true },
};
