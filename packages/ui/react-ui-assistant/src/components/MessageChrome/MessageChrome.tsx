//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, memo } from 'react';

import { TogglePanel } from '@dxos/react-ui-components';
import { type MessageChromeProps, isPrompt } from '@dxos/react-ui-feed';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Typography from '@dxos/react-ui/Typography';
import type * as Util from '@dxos/react-ui/Util';
import { type Actor, type ContentBlock, Message } from '@dxos/types';
import { getStyles, mx } from '@dxos/ui-theme';
import { stringToFallback } from '@dxos/util';

import { translationKey } from '../../translations.ts';
import { type DeliveryStatus, getDelivery, isUnread } from '../../types.ts';

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
  /** The reader's DID: their own prompts keep {@link userHue}, and only others' are named. */
  userDid?: string;
  /** Show each prompt's author — set when anyone besides the reader has written in the thread. */
  showAuthors?: boolean;
  /** Resolves a prompt's sender to a profile (e.g. a space member); the sender's own fields are the fallback. */
  getAuthor?: (sender: Actor.Actor) => MessageAuthor | undefined;
};

/** How a prompt's author is shown. */
export type MessageAuthor = {
  name?: string;
  hue?: string;
  emoji?: string;
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

const Time = ({ message }: { message: Message.Message }) => {
  const { t } = Hooks.useTranslation(translationKey);
  return <Typography.Timestamp date={message.created} variant='relative' justNow={t('just-now.label')} />;
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
  const delivery = getDelivery(message);

  return (
    <div role='toolbar' className={mx('flex items-center gap-1 text-xs text-fg-muted', classNames)}>
      <CopyButton message={message} />
      {/* Nothing to rewind to until the agent has taken the prompt up: it is not in the history yet. */}
      {onRewind && !isUnread(delivery) && (
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
      {/* A queued prompt the agent has not taken up can still be withdrawn; one it has, cannot. The
          thread's delegated `data-action` listener turns the click into a `remove-prompt` event. */}
      {isRemovable(delivery) && (
        <button
          type='button'
          className='underline underline-offset-2 hover:text-fg-default'
          data-action='remove'
          data-value={message.id}
          data-testid='chat.remove'
        >
          {t('delivery-remove.label')}
        </button>
      )}
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
// Delivery
//

const DELIVERY_ICONS: Record<DeliveryStatus, string> = {
  sent: 'ph--check--regular',
  delivered: 'ph--checks--regular',
  read: 'ph--checks--bold',
  failed: 'ph--warning-circle--regular',
};

const isRemovable = (status: DeliveryStatus | undefined): boolean => status === 'failed' || status === 'delivered';

/**
 * The ticks of a prompt still on its way to the agent, straddling the bubble's bottom edge: out of
 * flow, so a prompt carries no extra line for them and moving from sent to read never moves a row.
 */
const Delivery = ({ status }: { status: DeliveryStatus }) => {
  const { t } = Hooks.useTranslation(translationKey);
  const label = t(`delivery-${status}.label`);
  return (
    // An SVG takes no `title`, so the hover tooltip rides on a wrapper.
    <span
      className={mx(
        'absolute end-1.5 -bottom-2 flex',
        status === 'failed' ? 'text-error-text' : status === 'read' ? 'text-accent-text' : 'text-fg-subtle',
      )}
      title={label}
      data-testid='chat.delivery'
      data-delivery={status}
    >
      <Icon.Icon icon={DELIVERY_ICONS[status]} size='md' label={label} />
    </span>
  );
};

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
          {/* The header's own layout: the disclosure and the icon each sit in a `Layout.Block` either side of the title. */}
          <TogglePanel.Header icon={<Icon.Icon icon='ph--brain--regular' size='md' tone='muted' />}>
            <span className='text-sm text-fg-muted truncate'>{t('context.label')}</span>
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
// Author
//

/**
 * Whether the thread's prompts come from anyone other than the reader: a thread written by one
 * person has no need to say who wrote each prompt. Without the reader's DID, two distinct authors.
 * Keyed by DID alone, since a name is no identity: prompts from before DIDs were recorded carry only
 * the reader's own name.
 */
export const hasOtherAuthors = (messages: readonly Message.Message[], userDid?: string): boolean => {
  const authors = new Set<string>();
  for (const message of messages) {
    const key = isPrompt(message) ? message.sender.identityDid : undefined;
    if (key && key !== userDid) {
      authors.add(key);
      if (userDid || authors.size > 1) {
        return true;
      }
    }
  }
  return false;
};

/** A prompt's author: hue and emoji from their profile, else seeded from their DID as elsewhere in the app. */
const useAuthor = (sender: Actor.Actor) => {
  const { userDid, userHue, getAuthor } = useMessageChromeContext('Author');
  const did = sender.identityDid;
  if (!did) {
    return undefined;
  }

  const self = did === userDid;
  const author = getAuthor?.(sender);
  const fallback = stringToFallback(did);
  return {
    self,
    name: author?.name ?? sender.name ?? sender.email,
    hue: author?.hue ?? (self ? userHue : undefined) ?? fallback.hue,
    emoji: author?.emoji ?? fallback.emoji,
  };
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

// Bleeds into the gutter by its own inset, so a selection highlight frames the text rather than
// ending flush against it while the text keeps the column's alignment.
const Row = ({ children, classNames, streaming }: PropsWithChildren<{ classNames?: string; streaming?: boolean }>) => (
  <div
    className={mx('group/message relative -mx-2 px-2 py-2 rounded-md', classNames)}
    data-streaming={streaming || undefined}
    data-testid='feed.message'
  >
    {children}
  </div>
);

const promptReveal = mx('justify-end', reveal);

/**
 * Whether an answer row carries the toolbar: only when it has prose to copy or stats to show. A row
 * of machinery alone (a synthetic prompt, a tool run) would otherwise reserve a blank toolbar line.
 */
const hasToolbar = (message: Message.Message): boolean =>
  message.blocks.some(
    (block) =>
      block._tag === 'stats' || (block._tag === 'text' && block.disposition !== 'synthetic' && !!block.text.trim()),
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
  const { streaming, userHue, showAuthors } = useMessageChromeContext(MESSAGE_CHROME_NAME);
  const prompt = isPrompt(message);
  const delivery = prompt ? getDelivery(message) : undefined;
  const author = useAuthor(message.sender);
  const showAuthor = prompt && showAuthors && !!author;
  const hue = showAuthor ? author.hue : userHue;

  return (
    <Row classNames={mx(selected && 'bg-hover-surface')} streaming={streaming}>
      {prompt ? (
        <div className='min-w-0 flex flex-col items-end'>
          <div className='max-w-[70%] min-w-0'>
            <SyntheticContext message={message} />
            {showAuthor && !author.self && author.name && (
              <div className='pb-1 pe-8 text-end text-xs text-fg-muted truncate' data-testid='chat.author'>
                {author.name}
              </div>
            )}
            <div className='flex items-start gap-2'>
              {/* Sized by its own text, not the column: the toolbar below shares the column, and its
                  relative timestamp changing width ("just now" → "1 minute ago") resized the bubble. */}
              <div
                className={mx(
                  'relative w-fit max-w-full ms-auto px-3 py-2 border-s-2 rounded-sm bg-input-surface',
                  hue ? getStyles(hue).border : 'border-accent-bg',
                )}
              >
                {children}
                {delivery && <Delivery status={delivery} />}
              </div>
              {showAuthor && (
                <Avatar.Root
                  classNames='shrink-0 mt-1'
                  size='sm'
                  hue={Avatar.toAvatarHue(author.hue)}
                  fallback={author.emoji}
                  label={author.name}
                  data-testid='chat.avatar'
                />
              )}
            </div>
            {/* A removable prompt keeps its toolbar shown: it waits behind a streaming answer, which
                otherwise hides the toolbar, and remove is the one control it needs then. */}
            <PromptToolbar
              classNames={mx(isRemovable(delivery) ? 'justify-end pt-1' : promptReveal, showAuthor && 'pe-8')}
              message={message}
            />
          </div>
        </div>
      ) : (
        <div className='min-w-0'>
          {children}
          {hasToolbar(message) && <AssistantToolbar classNames={reveal} message={message} />}
        </div>
      )}
    </Row>
  );
};

MessageChrome.displayName = MESSAGE_CHROME_NAME;
