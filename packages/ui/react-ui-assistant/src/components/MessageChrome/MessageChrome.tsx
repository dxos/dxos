//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { type MessageChromeProps } from '@dxos/react-ui-feed';
import { Message } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations';
import { formatTime } from '../widgets';

//
// Context
//

const MESSAGE_CHROME_NAME = 'MessageChrome';

type MessageChromeContextValue = {
  /** Soft-fork the thread from the given prompt; the rewind button renders only when present. */
  onRewind?: (id: string) => void;
};

const [MessageChromeProvider, useMessageChromeContext] = createContext<MessageChromeContextValue>(MESSAGE_CHROME_NAME);

export { MessageChromeProvider };

//
// Toolbars
//

/** Copies the message's extracted text — the model's truth, not the DOM's partial render. */
const CopyButton = ({ message }: { message: Message.Message }) => {
  const { t } = useTranslation(translationKey);
  return (
    <IconButton
      icon='ph--copy--regular'
      iconOnly
      label={t('copy.label')}
      variant='ghost'
      density='sm'
      onClick={() => void navigator.clipboard?.writeText(Message.extractText(message))}
    />
  );
};

const timeOf = (message: Message.Message) => (
  <time dateTime={message.created} title={new Date(message.created).toLocaleString()}>
    {formatTime(message.created)}
  </time>
);

export type MessageToolbarProps = ThemedClassName<{
  message: Message.Message;
}>;

/**
 * The controls under the reader's own prompt: copy, rewind (edit-and-resend), and when it was
 * sent. Revealed on hover by the chrome, but never removed from flow — chrome that appears and
 * disappears changes the row's height, and a pointer travelling down a scrolling list would then
 * move every row below it.
 */
export const PromptToolbar = ({ classNames, message }: MessageToolbarProps) => {
  const { t } = useTranslation(translationKey);
  const { onRewind } = useMessageChromeContext('PromptToolbar');

  return (
    <div role='toolbar' className={mx('flex items-center gap-1 text-xs text-description', classNames)}>
      <CopyButton message={message} />
      {onRewind && (
        <IconButton
          icon='ph--clock-counter-clockwise--regular'
          iconOnly
          label={t('rewind.label')}
          variant='ghost'
          density='sm'
          data-testid='chat.rewind'
          onClick={() => onRewind(message.id)}
        />
      )}
      {timeOf(message)}
    </div>
  );
};

PromptToolbar.displayName = 'PromptToolbar';

/** The controls under an answer: copy, and when the answer finished. */
export const AssistantToolbar = ({ classNames, message }: MessageToolbarProps) => {
  return (
    <div role='toolbar' className={mx('flex items-center gap-1 text-xs text-description', classNames)}>
      <CopyButton message={message} />
      {timeOf(message)}
    </div>
  );
};

AssistantToolbar.displayName = 'AssistantToolbar';

//
// Chrome
//

/** Shared hover reveal: present in flow at all times, visible when the row is under the pointer. */
const reveal = 'pt-1 opacity-0 transition-opacity group-hover:opacity-100';

const Row = ({ children, classNames }: PropsWithChildren<{ classNames?: string }>) => (
  <div className={mx('group relative px-2 py-2', classNames)} data-testid='feed.message'>
    {children}
  </div>
);

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
  const prompt = message.sender.role === 'user';

  return (
    <Row classNames={mx(selected && 'bg-hover-surface')}>
      {prompt ? (
        <div className='min-w-0 flex flex-col items-end'>
          <div className='max-w-[66%] min-w-0'>
            <div className='px-4 py-3 border-s-2 border-accent-bg rounded-sm bg-input-surface'>{children}</div>
            <PromptToolbar classNames={mx('justify-end', reveal)} message={message} />
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
