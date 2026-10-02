//
// Copyright 2026 DXOS.org
//

import { useAtomSet, useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useMemo } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import { type Database, Filter, Obj, Order, Query, Scope } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import * as Containers from '@dxos/plugin-inbox/Containers';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { useSelection } from '@dxos/react-ui-attention';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { Message } from '@dxos/types';

//
// Story-only diagnostic panels for the `MailboxArticle` / `MessageArticle` stories: they read the
// active space's single mailbox and follow the mailbox cell's selection, so a layout places them
// beside `Cell.article(mailbox)` with no wiring of its own.
//

/** Stable context id of the thread cell, so the thread's JSON panel can follow its selection. */
export const THREAD_CONTEXT_ID = 'story/thread';

/** The attachment the selected-message cell opened, keyed by id because the chip hands back a snapshot. */
const openedAttachmentAtom = Atom.make<{ messageId: string; index: number } | undefined>(undefined);

const Placeholder = ({ label }: { label: string }) => (
  <div className='h-full grid place-items-center text-description'>{label}</div>
);

const feedQuery = (feed: Obj.Unknown | undefined) =>
  feed
    ? Query.select(Filter.type(Message.Message)).from([Scope.feed(Obj.getURI(feed, { prefer: 'absolute' }))])
    : Query.select(Filter.nothing());

/**
 * Summaries are immutable annotations on a second feed, keyed by `parentMessage` — surfaced here
 * because they are not on the message and would otherwise be invisible in the story.
 */
const useAnnotations = (db: Database.Database | undefined, mailbox: Mailbox.Mailbox | undefined) => {
  // TODO(wittjosiah): This additional hook call shouldn't be necessary, useResolveRef should handle this case.
  useObject(mailbox, 'annotations');
  const annotationsFeed = useResolveRef(mailbox?.annotations);
  return useQuery(db, feedQuery(annotationsFeed));
};

/** The active space's mailbox, its feed messages, and the message selected in the mailbox cell. */
const useMailboxSelection = () => {
  const space = Hooks.useActiveSpace();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const feed = useResolveRef(mailbox?.feed);
  const messages = useQuery(space?.db, feedQuery(feed));
  // The mailbox cell's attendable id, which `ModuleContainer` derives for `Cell.article(mailbox)`.
  const contextId = space && mailbox ? GraphPath.getCollectionsPath(space.id, mailbox.id) : undefined;
  const selectedId = useSelection(contextId, 'single');
  const selected = messages.find((message) => message.id === selectedId);
  return { db: space?.db, mailbox, messages, selected };
};

/**
 * Every content block that belongs to a message — its own, plus the blocks of the annotations
 * derived from it. Summaries are `Text` blocks with `disposition: 'summary'` living on a second
 * feed, so a view that reads only `message.blocks` never shows them.
 */
const blocksJson = (message: Message.Message, annotations: readonly Message.Message[]) => [
  ...message.blocks.map((block) => ({ ...block })),
  ...annotations
    .filter((annotation) => annotation.parentMessage === message.id)
    .flatMap((annotation) => annotation.blocks.map((block) => ({ ...block, model: annotation.properties?.model }))),
];

/** The selected message's object JSON, headed by its derived summary. */
export const SelectedMessageJsonModule = () => {
  const { db, mailbox, selected } = useMailboxSelection();
  const annotations = useAnnotations(db, mailbox);
  const summary = useMemo(
    () => (selected ? Mailbox.summaryIndex(annotations).get(selected.id) : undefined),
    [annotations, selected],
  );
  if (!selected) {
    return <Placeholder label='Select a message' />;
  }

  return (
    <div className='h-full overflow-auto' data-testid='message-json'>
      {summary && (
        <div className='p-2 text-sm text-description' data-testid='message-summary'>
          {summary}
        </div>
      )}
      <JsonHighlighter data={selected} />
    </div>
  );
};

/** The selected message's content blocks, including those of its annotations. */
export const SelectedMessageBlocksModule = () => {
  const { db, mailbox, selected } = useMailboxSelection();
  const annotations = useAnnotations(db, mailbox);
  if (!selected) {
    return <Placeholder label='Select a message' />;
  }

  return (
    <div className='h-full overflow-auto p-2 text-sm' data-testid='message-blocks'>
      <JsonHighlighter data={blocksJson(selected, annotations)} />
    </div>
  );
};

/**
 * The message plank: the message selected in the mailbox cell, rendered through `MessageArticle`
 * directly because the story must observe the attachment chip, which the surface only turns into a
 * `LayoutOperation.Open` the storybook layout does not route.
 */
export const SelectedMessageModule = ({ data }: { data?: { attendableId?: string } }) => {
  const { mailbox, selected } = useMailboxSelection();
  const setAttachment = useAtomSet(openedAttachmentAtom);
  const handleOpenAttachment = useCallback(
    (message: Mailbox.MessageLike, index: number) => setAttachment({ messageId: message.id, index }),
    [setAttachment],
  );
  if (!selected || !mailbox) {
    return <Placeholder label='Select a message' />;
  }

  return (
    <Containers.MessageArticle
      role='article'
      subject={selected}
      mailbox={mailbox}
      attendableId={data?.attendableId}
      onOpenAttachment={handleOpenAttachment}
    />
  );
};

/** The attachment plank: the plugin's real attachment surface for the chip opened in the message cell. */
export const AttachmentModule = ({ data }: { data?: { attendableId?: string } }) => {
  const { messages } = useMailboxSelection();
  const attachment = useAtomValue(openedAttachmentAtom);
  const message = attachment && messages.find(({ id }) => id === attachment.messageId);
  if (!attachment || !message) {
    return <Placeholder label='Open an attachment' />;
  }

  return (
    <Surface.Surface
      type={AppSurface.Article}
      data={{ subject: { message, index: attachment.index }, attendableId: data?.attendableId }}
      limit={1}
    />
  );
};

/** The mailbox's one thread in created order, including drafts added at the space root. */
const useThread = () => {
  const space = Hooks.useActiveSpace();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const feed = useResolveRef(mailbox?.feed);
  const messages = useQuery(
    space?.db,
    feed
      ? Query.select(Filter.type(Message.Message))
          .from([Scope.space(), Scope.feed(Obj.getURI(feed, { prefer: 'absolute' }))])
          .orderBy(Order.property('created', 'asc'))
      : Query.select(Filter.nothing()),
  );
  return { db: space?.db, mailbox, messages, subject: messages.at(-1) };
};

/**
 * The thread opened from its most recent message, the way the `mailboxMessage` graph connector opens
 * one. Rendered through `MessageArticle` directly because the message surface resolves its mailbox
 * from the app-graph parent node, which a story cell does not have.
 */
export const ThreadModule = () => {
  const { mailbox, subject } = useThread();
  if (!mailbox || !subject) {
    return <Placeholder label='Loading thread' />;
  }

  return (
    <Containers.MessageArticle role='article' subject={subject} mailbox={mailbox} attendableId={THREAD_CONTEXT_ID} />
  );
};

/** Plain projection of a message — the live proxy carries internals that add noise. */
const messageJson = (message: Message.Message, summary?: string) => ({
  id: message.id,
  created: message.created,
  threadId: message.threadId,
  parentMessage: message.parentMessage,
  sender: message.sender,
  properties: message.properties,
  blocks: message.blocks.map((block) =>
    block._tag === 'text'
      ? { _tag: block._tag, disposition: block.disposition, length: block.text.length }
      : { _tag: block._tag },
  ),
  summary,
});

/**
 * JSON of the thread's selected message, so what the article displays can be read against the
 * object behind it. The conversation stack publishes no per-tile selection yet, so this falls back
 * to the message the thread was opened for.
 */
export const ThreadJsonModule = () => {
  const { db, mailbox, messages, subject } = useThread();
  const annotations = useAnnotations(db, mailbox);
  const summaries = useMemo(() => Mailbox.summaryIndex(annotations), [annotations]);
  const selectedId = useSelection(THREAD_CONTEXT_ID, 'single');
  const selected = messages.find((message) => message.id === selectedId) ?? subject;
  if (!selected) {
    return <Placeholder label='Loading thread' />;
  }

  return (
    <div className='h-full overflow-auto' data-testid='thread-json'>
      <JsonHighlighter data={messageJson(selected, summaries.get(selected.id))} />
    </div>
  );
};
