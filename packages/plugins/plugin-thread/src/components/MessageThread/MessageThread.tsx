//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Obj } from '@dxos/echo';
import { type Identity, type Space } from '@dxos/halo';
import { type ThemedClassName, composable, useTranslation } from '@dxos/react-ui';
import {
  MessageDocument,
  type MessageDocumentProps,
  type MessageLike,
  type MessageQuote,
  Thread,
  type ThreadRootProps,
} from '@dxos/react-ui-thread';
import { type Message } from '@dxos/types';

import { meta } from '#meta';

import { getMessageMetadata } from '../../util';

export type MessageThreadProps = ThemedClassName<{
  /** Stable id used for the underlying thread root and message metadata. */
  id: string;
  /** Identity used to attribute outgoing messages in the textbox metadata. */
  identity?: Identity.Info;
  /** Space members for rendering sender names/avatars on incoming messages. */
  members: readonly Space.Member[];
  /** Messages to render in order. */
  messages: readonly Message.Message[];
  /** Activity indicator (e.g. processing) shown beneath the textbox. */
  activity?: boolean;
  /** Autofocus textbox */
  autoFocus?: boolean;
  /** Marks the thread as the current/attended one. */
  current?: boolean | string;
  /**
   * When true, hide the composer textbox and activity indicator. Used for
   * channels whose source-of-truth lives elsewhere (e.g. externally-synced
   * Slack/Discord channels keyed by a foreign id) — sending isn't meaningful
   * because there is no local-write path back to the source.
   */
  readOnly?: boolean;
  /**
   * Called with the user's textbox content when they press send.
   * Returning `true` signals the message was accepted; the textbox is then cleared.
   */
  onSend: (text: string) => boolean;
  /** When true, the author may edit their own messages in place. */
  editable?: boolean;
  /** Placeholder for the composer; defaults to the channel message placeholder. */
  placeholder?: string;
  /** Folded reactions for a message (omit to render none). */
  getReactions?: MessageDocumentProps['getReactions'];
  /** Folded thread branching from a message (omit to hide the affordance). */
  getThreadSummary?: MessageDocumentProps['getThreadSummary'];
  /** Whether a message may be deleted (omit to allow every message). */
  canDelete?: ThreadRootProps['canDelete'];
  /** Toggle the local identity's reaction (omit to hide reactions). */
  onMessageReact?: (messageId: string, emoji: string) => void;
  /** Delete a message (omit to hide the affordance). */
  onMessageDelete?: (messageId: string) => void;
  /** Open the thread branching from a message (omit to hide the affordance). */
  onThreadOpen?: (messageId: string) => void;
  /** Declare a message a thread root and open it (omit to hide the affordance). */
  onThreadCreate?: (messageId: string) => void;
  /** Quote-reply to a message (omit to hide the affordance). */
  onMessageReply?: (messageId: string) => void;
  /** Message the composer currently targets; renders the reply banner above it. */
  replyTo?: Message.Message;
  /** Clears the pending reply target. */
  onCancelReply?: () => void;
}>;

/**
 * Pure message-thread UI: the message document + composer textbox + activity indicator, built on the
 * `@dxos/react-ui-thread` primitives. Does not load data or invoke operations — the caller passes
 * messages and an `onSend` callback. Used by `ChannelArticle`, `ChannelThreadArticle` and
 * `ThreadArticle`.
 *
 * Messages render as one CodeMirror document rather than a stack of tiles, which is what the
 * assistant chat and the transcription view render into as well. Everything a message carries around
 * its body — heading, quote, reactions, thread row, hover toolbar — is still the tile stack's own
 * component, portaled into a widget.
 */
export const MessageThread = composable<HTMLDivElement, MessageThreadProps>(
  (
    {
      id,
      identity,
      members,
      messages,
      activity,
      onSend,
      autoFocus,
      current,
      readOnly,
      editable,
      placeholder,
      getReactions,
      getThreadSummary,
      canDelete,
      onMessageReact,
      onMessageDelete,
      onThreadOpen,
      onThreadCreate,
      onMessageReply,
      replyTo,
      onCancelReply,
      classNames,
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(meta.profile.key);

    const textboxMetadata = useMemo(() => getMessageMetadata(id, identity), [id, identity]);

    const getMetadata = useCallback(
      (message: MessageLike) => {
        // TODO(burdon): Factor out.
        const sender = members.find(
          (member) =>
            (message.sender.identityDid && member.did === message.sender.identityDid) ||
            (message.sender.identityKey && member.identityKey === message.sender.identityKey),
        );

        // Pass `message.sender` as the fallback so externally-synced messages
        // (Slack, etc.) display the source-side sender name instead of "Anonymous"
        // when no DXOS identity matches.
        return getMessageMetadata(message.id, sender, message.sender, message.created);
      },
      [members],
    );

    // The document does not follow refs itself, so a reply's target is resolved here — the same
    // place that already knows how to name a sender.
    const getQuote = useCallback(
      (message: MessageLike): MessageQuote | undefined => {
        const parent = message.parentMessage?.target;
        if (!parent) {
          return undefined;
        }

        const text = parent.blocks.flatMap((block) => (block._tag === 'text' ? [block.text] : [])).join(' ');
        return { authorName: getMetadata(parent).authorName, text };
      },
      [getMetadata],
    );

    // Which message is an input, and what it becomes when committed. The document holds the draft
    // until then, so an incoming revision of that message cannot overwrite what is being typed.
    const [editingId, setEditingId] = useState<string | undefined>(undefined);
    // Written back through the live object the caller passed, looked up by id: what the document
    // reports is whichever shape it was rendering, which may be a snapshot.
    const handleEditCommit = useCallback(
      (edited: MessageLike, text: string) => {
        const message = messages.find((candidate) => candidate.id === edited.id);
        if (message) {
          Obj.update(message, (message) => {
            const block = message.blocks.find((block) => block._tag === 'text');
            if (block?._tag === 'text') {
              block.text = text;
            }
          });
        }
        setEditingId(undefined);
      },
      [messages],
    );

    return (
      <Thread.Root
        getMetadata={getMetadata}
        getReactions={getReactions}
        getThreadSummary={getThreadSummary}
        canDelete={canDelete}
        identityDid={identity?.did}
        editable={editable ?? false}
        onMessageReact={onMessageReact}
        onMessageDelete={onMessageDelete}
        onThreadOpen={onThreadOpen}
        onThreadCreate={onThreadCreate}
        onMessageReply={onMessageReply}
      >
        <Thread.Content id={id} current={current} classNames={['dx-container h-full', classNames]} ref={forwardedRef}>
          <MessageDocument
            classNames='grow min-h-0'
            messages={messages}
            editingId={editingId}
            getMetadata={getMetadata}
            getReactions={getReactions}
            getQuote={getQuote}
            getThreadSummary={getThreadSummary}
            onAction={(action, message) => action === 'edit' && setEditingId(message.id)}
            onReact={(message, emoji) => onMessageReact?.(message.id, emoji)}
            onThreadOpen={(message) => onThreadOpen?.(message.id)}
            onEditCommit={handleEditCommit}
            onEditCancel={() => setEditingId(undefined)}
          />
          {!readOnly && (
            <>
              {replyTo && onCancelReply && <Thread.ReplyBanner replyTo={replyTo} onCancel={onCancelReply} />}
              <Thread.Textbox
                {...textboxMetadata}
                autoFocus={autoFocus}
                placeholder={placeholder ?? t('message.placeholder')}
                onSend={onSend}
              />
              <Thread.Status activity={activity}>{t('activity.message')}</Thread.Status>
            </>
          )}
        </Thread.Content>
      </Thread.Root>
    );
  },
);
