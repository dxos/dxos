//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, memo, useEffect, useState } from 'react';

import { TogglePanel } from '@dxos/react-ui-components';
import { type MessageChromeProps, isPrompt } from '@dxos/react-ui-feed';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import type * as Util from '@dxos/react-ui/Util';
import { type ContentBlock, Message } from '@dxos/types';
import { getStyles, mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations.ts';
import { formatTime } from './format-time.ts';

//
// Context
//

const MESSAGE_CHROME_NAME = 'MessageChrome';

type MessageChromeContextValue = {
  /** Soft-fork the thread from the given prompt; the rewind button renders only when present. */
  onRewind?: (id: string) => void;
  /** While an answer is streaming the toolbars stay hidden — still in flow, never revealed. */
  streaming?: boolean;
  /** Show synthetic context panels (off in the summary view). */
  showContext?: boolean;
  /** Show the message id in the toolbars — one turn is several messages, and ids say which. */
  debug?: boolean;
  /** The reader's identity hue; a prompt's edge wears it, so whose turn it is reads by colour too. */
  userHue?: string;
};

// Every field is optional configuration, so a missing provider defaults instead of throwing.
const [MessageChromeProvider, useMessageChromeContext] = Hooks.createContext<MessageChromeContextValue>(
  MESSAGE_CHROME_NAME,
  {},
);

export { MessageChromeProvider };

//
// Toolbars
//

/** Copies the message's extracted text — the model's truth, not the DOM's partial render. */
const CopyButton = ({ message }: { message: Message.Message }) => {
  const { t } = Hooks.useTranslation(translationKey);
  return (
    <SystemButton.Clipboard
      iconOnly
      label={t('copy.label')}
      variant='ghost'
      size='sm'
      onCopy={() => Message.extractText(message)}
    />
  );
};

const MessageId = ({ message }: { message: Message.Message }) => {
  const { debug } = useMessageChromeContext('MessageId');
  if (!debug) {
    return null;
  }

  return (
    <span className='font-mono text-fg-subtle' title={message.id}>
      {message.id.slice(-8)}
    </span>
  );
};

/** How often a relative time is re-read; the coarsest label it shows changes by the minute. */
const TIME_REFRESH_MS = 30_000;

const Time = ({ message }: { message: Message.Message }) => {
  const { t } = Hooks.useTranslation(translationKey);
  // Its own clock: the toolbar is memoized, so nothing else re-renders a label that has gone stale.
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), TIME_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <time dateTime={message.created} title={new Date(message.created).toLocaleString()}>
      {formatTime(message.created, { now, justNow: t('just-now.label') })}
    </time>
  );
};

export type MessageToolbarProps = Util.ThemedClassName<{
  message: Message.Message;
}>;

/**
 * The controls under the reader's own prompt: copy, rewind (edit-and-resend), and when it was
 * sent. Revealed on hover by the chrome, but never removed from flow — chrome that appears and
 * disappears changes the row's height, and a pointer travelling down a scrolling list would then
 * move every row below it.
 */
export const PromptToolbar = memo(({ classNames, message }: MessageToolbarProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const { onRewind } = useMessageChromeContext('PromptToolbar');

  return (
    <div role='toolbar' className={mx('flex items-center gap-1 text-xs text-fg-muted', classNames)}>
      <CopyButton message={message} />
      {onRewind && (
        <Button.Root
          icon='ph--clock-counter-clockwise--regular'
          iconOnly
          label={t('rewind.label')}
          variant='ghost'
          size='sm'
          data-testid='chat.rewind'
          onClick={() => onRewind(message.id)}
        />
      )}
      <Time message={message} />
      <MessageId message={message} />
    </div>
  );
});

PromptToolbar.displayName = 'PromptToolbar';

/** The controls under an answer: copy, and when the answer finished. */
export const AssistantToolbar = memo(({ classNames, message }: MessageToolbarProps) => {
  return (
    <div role='toolbar' className={mx('flex items-center gap-1 text-xs text-fg-muted', classNames)}>
      <CopyButton message={message} />
      <Time message={message} />
      <MessageId message={message} />
      {/* Pushed to the far end: the cost of the turn is a footnote, not a control. */}
      <Stats message={message} classNames='ms-auto' />
    </div>
  );
});

AssistantToolbar.displayName = 'AssistantToolbar';

/** Thousands abbreviated to one decimal, so the count stays one glance wide as a turn grows. */
const formatTokens = (tokens: number): string => (tokens >= 1_000 ? `${(tokens / 1_000).toFixed(1)}k` : String(tokens));

/**
 * What the turn cost, beside what it produced — the toolbar is where a reader looks for a message's
 * metadata, and a widget of its own would take a row of the thread to say one line.
 */
const Stats = ({ classNames, message }: Util.ThemedClassName<{ message: Message.Message }>) => {
  const stats = message.blocks.find((block) => block._tag === 'stats') as ContentBlock.Stats | undefined;
  const tokens = stats?.usage?.totalTokens;
  const duration = stats?.duration;
  if (tokens === undefined && duration === undefined) {
    return null;
  }

  return (
    <span className={mx('flex items-center gap-1 tabular-nums', classNames)}>
      {tokens !== undefined && <span>{formatTokens(tokens)} tokens</span>}
      {tokens !== undefined && duration !== undefined && <span aria-hidden>·</span>}
      {duration !== undefined && <span>{(duration / 1_000).toFixed(1)}s</span>}
    </span>
  );
};

Stats.displayName = 'Stats';

//
// Context
//

/**
 * Synthetic context riding on a prompt (a document selection, an encoded event): system-generated
 * input, so it renders as its own dimmed panel above the bubble — the bubble frames only the
 * reader's words.
 */
const SyntheticContext = ({ message }: { message: Message.Message }) => {
  const { t } = Hooks.useTranslation(translationKey);
  const { showContext = true } = useMessageChromeContext('SyntheticContext');
  const context = message.blocks
    .filter((block) => block._tag === 'text' && block.disposition === 'synthetic')
    .map((block) => (block as { text: string }).text)
    .join('\n\n');
  if (!showContext || !context.length) {
    return null;
  }

  return (
    <div className='pb-1 opacity-60' data-testid='chat.context'>
      <TogglePanel.Root>
        <TogglePanel.Content classNames='border border-separator-subtle rounded-sm'>
          <TogglePanel.Header classNames='flex items-center gap-2 px-2 py-1 text-sm'>
            <span className='grow text-fg-muted truncate'>{t('context.label')}</span>
            <Icon.Icon icon='ph--brain--regular' size='md' tone='muted' />
          </TogglePanel.Header>
          <TogglePanel.Body>
            <TogglePanel.Viewport classNames='px-2 pb-1 max-h-40 overflow-y-auto text-sm text-fg-muted whitespace-pre-wrap'>
              {context}
            </TogglePanel.Viewport>
          </TogglePanel.Body>
        </TogglePanel.Content>
      </TogglePanel.Root>
    </div>
  );
};

//
// Chrome
//

/**
 * Shared hover reveal: present in flow at all times, visible when the row is under the pointer.
 *
 * A named group: the bare `group` variant matches ANY ancestor carrying `group`, and the app's
 * planks do — every toolbar lit up when the pointer was anywhere in the deck. Streaming hides it
 * from the row's attribute rather than the toolbar's props, so the memoized toolbars do not
 * re-render on every row each time a turn starts or ends.
 */
const reveal =
  'pt-1 opacity-0 transition-opacity group-hover/message:opacity-100 group-data-[streaming]/message:invisible';

const Row = ({ children, classNames, streaming }: PropsWithChildren<{ classNames?: string; streaming?: boolean }>) => (
  <div
    className={mx('group/message relative py-2', classNames)}
    data-streaming={streaming || undefined}
    data-testid='feed.message'
  >
    {children}
  </div>
);

const promptReveal = mx('justify-end', reveal);

/**
 * The assistant feed's per-message frame: the reader's prompts and the model's answers are framed
 * differently because they are different kinds of thing — a prompt is an instruction the thread
 * can be rewound to, an answer is a result.
 *
 * A prompt sits apart from the model's prose: right-aligned, at most two thirds of the viewport —
 * the chat convention that makes whose-turn legible at a glance — with its toolbar following the
 * bubble's edge.
 */
export const MessageChrome = ({ message, selected, children }: MessageChromeProps) => {
  const { streaming, userHue } = useMessageChromeContext(MESSAGE_CHROME_NAME);
  const prompt = isPrompt(message);

  return (
    <Row classNames={mx(selected && 'bg-hover-surface')} streaming={streaming}>
      {prompt ? (
        <div className='min-w-0 flex flex-col items-end'>
          <div className='max-w-[70%] min-w-0'>
            <SyntheticContext message={message} />
            <div
              className={mx(
                'px-3 py-2 border-s-2 rounded-sm bg-input-surface',
                userHue ? getStyles(userHue).border : 'border-accent-bg',
              )}
            >
              {children}
            </div>
            <PromptToolbar classNames={promptReveal} message={message} />
          </div>
        </div>
      ) : (
        <div className='min-w-0'>
          {children}
          <AssistantToolbar classNames={reveal} message={message} />
        </div>
      )}
    </Row>
  );
};

MessageChrome.displayName = MESSAGE_CHROME_NAME;
