//
// Copyright 2025 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject, useQuery, useResolveRef } from '@dxos/react-client/echo';
import { Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { getParentId, isLinkedSegment } from '@dxos/react-ui-attention';
import { TagIndex } from '@dxos/schema';
import { type Message as MessageType } from '@dxos/types';

import { EditMessage, Message, type MessageHeaderProps, type ViewMode } from '#components';
import { useActorContact, useEmailComposerExtensions, useSendEmail } from '#hooks';
import { meta } from '#meta';
import { DraftMessage, InboxOperation, Mailbox } from '#types';

import { getMailboxMessagePath } from '../../paths';
import { createDraftMessage } from '../../util';

/** Messages default to rendering the raw email HTML; markdown/plain are opt-in toolbar views. */
const DEFAULT_VIEW_MODE: ViewMode = 'html';

type MessageOrRef = MessageType.Message | Ref.Ref<MessageType.Message>;

const keyOf = (message: MessageOrRef): string => (Ref.isRef(message) ? String(message.uri) : Obj.getURI(message));

/**
 * `subject` is either a single message or its whole conversation (thread). The companion graph node
 * assigns the thread directly (see the `mailboxMessage` connector) so the article renders it without
 * re-querying; section/other callers may pass a single message. The thread already includes any
 * inline reply/forward drafts (the connector merges synced feed messages and local drafts in one
 * combined-scope query), interleaved chronologically.
 */
export type MessageArticleProps = AppSurface.ArticleProps<
  MessageType.Message | MessageType.Message[],
  {
    mailbox?: Mailbox.Mailbox;
    testId?: string;
  }
>;

/**
 * Message/conversation detail view. Renders the opened conversation as a vertical stack — each member
 * resolved by its own leaf (see {@link ThreadMessageItem}) so subscriptions stay granular. `subject`
 * is the whole thread (assigned by the companion graph node) or a single message. Toolbar actions
 * (reply/forward/delete) act on the newest synced message — never an inline draft.
 */
export const MessageArticle = ({
  role,
  subject,
  attendableId,
  companionTo,
  mailbox: mailboxProp,
  testId,
}: MessageArticleProps) => {
  const toolbarAttendableId = attendableId && isLinkedSegment(attendableId) ? getParentId(attendableId) : attendableId;
  const mailbox = Mailbox.instanceOf(companionTo) ? companionTo : mailboxProp;

  // Normalize the singular-or-plural subject to a conversation (chronological, drafts interleaved).
  const messages: MessageType.Message[] = Array.isArray(subject) ? subject : [subject];

  // Reply/forward act on the newest real (non-draft) message — the tail may be an unsent draft.
  const anchorMessage = useMemo(
    () =>
      [...messages].reverse().find((candidate) => !DraftMessage.instanceOf(candidate)) ?? messages[messages.length - 1],
    [messages],
  );

  const db = Obj.getDatabase(anchorMessage);
  const sender = useActorContact(db, anchorMessage.sender);

  // View mode is owned here and shared (controlled) across the toolbar and every message body, which
  // render in separate `Message.Root`s — so the toolbar's switch applies to all bodies.
  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_VIEW_MODE);

  const { invokePromise } = useOperationInvoker();
  const handleContactCreate = useCallback<NonNullable<MessageHeaderProps['onContactCreate']>>(
    (actor) => {
      if (db && actor) {
        void invokePromise(InboxOperation.ExtractContact, { db, actor });
      }
    },
    [db, invokePromise],
  );

  const handleOpen = useCallback(() => {
    if (!mailbox || !db) {
      return;
    }
    void invokePromise(LayoutOperation.Open, {
      subject: [getMailboxMessagePath(db.spaceId, mailbox.id, anchorMessage.id)],
    });
  }, [mailbox, db, anchorMessage.id, invokePromise]);

  const openDraft = useCallback(
    (mode: 'reply' | 'reply-all' | 'forward') => {
      if (db) {
        // Add the draft directly; it shares the thread's `threadId`, so the `mailboxMessage` connector
        // query picks it up reactively and renders it inline — no navigation, no operation needed.
        db.add(DraftMessage.make(createDraftMessage({ mode, message: anchorMessage, mailbox })));
      }
    },
    [db, anchorMessage, mailbox],
  );
  const handleReply = useCallback(() => openDraft('reply'), [openDraft]);
  const handleReplyAll = useCallback(() => openDraft('reply-all'), [openDraft]);
  const handleForward = useCallback(() => openDraft('forward'), [openDraft]);

  // AI reply: generate a grounded body first (thread + facts), then open the reply draft prefilled.
  // `spaceId` scopes the spawned operation so its space-affinity services (Database/FactStore) resolve.
  const handleAiReply = useCallback(async () => {
    if (!db || !mailbox) {
      return;
    }
    try {
      const result = await invokePromise(
        InboxOperation.GenerateReply,
        { mailbox: Ref.make(mailbox), message: anchorMessage },
        { spaceId: db.spaceId },
      );
      void invokePromise(InboxOperation.DraftEmailAndOpen, {
        db,
        mode: 'reply',
        message: anchorMessage,
        mailbox,
        body: result?.data?.body,
      });
    } catch (err) {
      // Reply generation calls an LLM that can fail; fall back to opening an empty reply draft so the
      // action never leaves the user without a draft (and never leaks an unhandled rejection).
      log.catch(err);
      void invokePromise(InboxOperation.DraftEmailAndOpen, { db, mode: 'reply', message: anchorMessage, mailbox });
    }
  }, [db, invokePromise, anchorMessage, mailbox]);

  // Delete the opened message (draft locally; synced message is trashed on Gmail and removed from the
  // feed). `spaceId` scopes the spawned operation process so its space-affinity services materialize.
  const handleDelete = useCallback(() => {
    if (mailbox) {
      void invokePromise(InboxOperation.DeleteEmail, { mailbox, message: anchorMessage }, { spaceId: db?.spaceId });
    }
  }, [invokePromise, db, mailbox, anchorMessage]);

  // Scroll to a newly-appended draft (each Reply/Reply All/Forward press appends one at the tail); the
  // composer itself autofocuses (`Form.Root autoFocus` in `EditMessage`) once scrolled into view.
  const viewportRef = useRef<HTMLDivElement>(null);
  const tail = messages[messages.length - 1];
  const tailId = keyOf(tail);
  const tailIsDraft = DraftMessage.instanceOf(tail);
  useEffect(() => {
    if (tailIsDraft) {
      viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [tailId, tailIsDraft]);

  return (
    <Panel.Root role={role} data-testid={testId}>
      <Message.Root
        attendableId={toolbarAttendableId}
        viewMode={viewMode}
        setViewMode={setViewMode}
        message={anchorMessage}
        mailbox={mailbox}
        sender={sender}
        onOpen={companionTo ? handleOpen : undefined}
        onReply={handleReply}
        onReplyAll={handleReplyAll}
        onForward={handleForward}
        onAiReply={mailbox ? handleAiReply : undefined}
        onDelete={mailbox ? handleDelete : undefined}
      >
        <Panel.Toolbar asChild>
          <Message.Toolbar />
        </Panel.Toolbar>
      </Message.Root>
      <Panel.Content asChild>
        <ScrollArea.Root padding thin>
          <ScrollArea.Viewport ref={viewportRef}>
            {/* TODO(wittjosiah): Give each message in the stack its own toolbar so reply/reply-all/
                forward act on that specific message, rather than a single article-level toolbar that
                always targets the newest one. */}
            <div className='dx-document flex flex-col'>
              {/* TODO(burdon): Better UI for threads. */}
              {messages.map((messageOrRef) =>
                DraftMessage.instanceOf(messageOrRef) ? (
                  // Drafts resolve their own live object and switch composer↔read-only reactively (see
                  // {@link DraftThreadItem}); the parent can't gate on the sent flag here because its
                  // array element comes from the connector's index-hydrated query and lags the mutation.
                  <div key={keyOf(messageOrRef)} className='border-be border-separator'>
                    <DraftThreadItem
                      message={messageOrRef}
                      mailbox={mailbox}
                      viewMode={viewMode}
                      setViewMode={setViewMode}
                      onContactCreate={handleContactCreate}
                    />
                  </div>
                ) : (
                  <div key={keyOf(messageOrRef)} className='border-be border-separator'>
                    <ThreadMessageItem
                      message={messageOrRef}
                      mailbox={mailbox}
                      viewMode={viewMode}
                      setViewMode={setViewMode}
                      onContactCreate={handleContactCreate}
                    />
                  </div>
                ),
              )}
            </div>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

type DraftThreadItemProps = {
  message: MessageType.Message;
  mailbox?: Mailbox.Mailbox;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onContactCreate: NonNullable<MessageHeaderProps['onContactCreate']>;
};

/**
 * A draft in the conversation stack. Re-resolves its own live, persisting object by id: the object in
 * the connector's ordered/windowed query is index-hydrated and detached (`Obj.update` on it silently
 * no-ops), so editing it wouldn't persist. Rendering waits for the live object so the composer's
 * uncontrolled editor initializes from the persisted body rather than the stale thread copy.
 */
const DraftThreadItem = ({ message, mailbox, ...rest }: DraftThreadItemProps) => {
  const db = mailbox ? Obj.getDatabase(mailbox) : Obj.getDatabase(message);
  const live = useQuery(db, Filter.id(message.id))[0];
  if (!live) {
    return null;
  }

  return <DraftThreadItemContent message={live} mailbox={mailbox} {...rest} />;
};

// Stable fallback while the mailbox tag index is unresolved, so the tag-uris atom is unconditional.
const EMPTY_TAG_URIS_ATOM = Atom.make<string[]>(() => []);

/**
 * Renders a resolved live draft: the inline composer while unsent, locking to the read-only leaf once
 * the provider's sent tag is applied (on send) — reactively, via the tag-index membership — until the
 * sync reconciliation stage swaps in the canonical feed message.
 */
const DraftThreadItemContent = ({ message, mailbox, viewMode, setViewMode, onContactCreate }: DraftThreadItemProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const extensions = useEmailComposerExtensions(message);
  const onSend = useSendEmail(message);

  // Sent once the draft carries the provider sent tag `useSendEmail` recorded on it (`sentTagUri`).
  // Read membership reactively from the tag index: the tag-uri list re-fires the instant the tag is
  // applied on send, whereas reading the message property alone would not.
  const tagIndex = useResolveRef(mailbox?.tags);
  const tagUrisAtom = useMemo(
    () => (tagIndex ? TagIndex.atom(tagIndex)(message.id) : EMPTY_TAG_URIS_ATOM),
    [tagIndex, message.id],
  );
  const tagUris = useAtomValue(tagUrisAtom);
  const sentTagUri = message.properties?.sentTagUri;
  const sent = typeof sentTagUri === 'string' && tagUris.includes(sentTagUri);

  const handleDelete = useCallback(() => {
    if (mailbox) {
      void invokePromise(
        InboxOperation.DeleteEmail,
        { mailbox, message },
        { spaceId: Obj.getDatabase(mailbox)?.spaceId },
      );
    }
  }, [invokePromise, mailbox, message]);

  if (sent) {
    return (
      <ThreadMessageItem
        message={message}
        mailbox={mailbox}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onContactCreate={onContactCreate}
      />
    );
  }

  return (
    <EditMessage
      message={message}
      extensions={extensions}
      onSend={onSend}
      title={t('draft-message.title')}
      onDelete={mailbox ? handleDelete : undefined}
    />
  );
};

/**
 * A single message within the conversation stack. Owns its own subscription so reactivity is pushed to
 * the leaf — the parent holds only messages/refs, not resolved objects. `useObject` dereferences the
 * ref via its loading atom and re-renders when it loads, returning a snapshot the message components
 * render directly.
 */
const ThreadMessageItem = ({
  message: messageOrRef,
  mailbox,
  viewMode,
  setViewMode,
  onContactCreate,
}: {
  message: MessageOrRef;
  mailbox?: Mailbox.Mailbox;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onContactCreate: NonNullable<MessageHeaderProps['onContactCreate']>;
}) => {
  const [message] = useObject(messageOrRef);
  const db = mailbox ? Obj.getDatabase(mailbox) : undefined;
  const sender = useActorContact(db, message?.sender);

  if (!message) {
    return null;
  }

  return (
    <Message.Root viewMode={viewMode} setViewMode={setViewMode} message={message} mailbox={mailbox} sender={sender}>
      <Message.Header onContactCreate={onContactCreate} />
      <Message.Body />
    </Message.Root>
  );
};

MessageArticle.displayName = 'MessageArticle';
