//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomSet, useAtomValue } from '@effect-atom/atom-react';
import React, {
  type FC,
  type KeyboardEvent,
  type MouseEvent,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Filter, Obj, Ref } from '@dxos/echo';
import { DxAvatar } from '@dxos/lit-ui/react';
import { log } from '@dxos/log';
import { useObject, useQuery, useResolveRef } from '@dxos/react-client/echo';
import { ScrollArea, type ThemedClassName, composable, composableProps, useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { TagIndex } from '@dxos/schema';
import { DraftMessage, type Message as MessageType } from '@dxos/types';

import { useActorContact, useEmailComposerExtensions, useSendEmail } from '#hooks';
import { meta } from '#meta';
import { InboxCapabilities, InboxOperation, Mailbox, SystemTags } from '#types';

import { getMailboxMessagePath } from '../../paths';
import { createDraftMessage, getMessageProps } from '../../util';
import { EditMessage } from '../EditMessage';
import { Message, type MessageHeaderProps } from '../Message';
import { type ViewMode, viewModeGroup } from '../ViewMode';

//
// Types
//

type MessageOrRef = MessageType.Message | Ref.Ref<MessageType.Message>;

/** Stable id for a message or unresolved ref, keying tiles and collapse state. */
export const keyOf = (message: MessageOrRef): string =>
  Ref.isRef(message) ? String(message.uri) : Obj.getURI(message);

/** Per-tile data: a message or unresolved ref (drafts are always resolved objects). */
type ConversationTileData = {
  id: string;
  message: MessageOrRef;
};

/** Per-message action handlers, bound to the individual message the tile renders. */
type ConversationMessageHandlers = {
  onOpen?: () => void;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  onAiReply?: () => void;
  onDelete?: () => void;
};

//
// Context
//

// State shared by every tile in the conversation. `viewMode` and `expanded` are owned by the article
// so the thread toolbar can drive them across all bodies at once.
type ConversationStackContextValue = {
  /** Single attendable id shared by every tile so the whole conversation is attended together. */
  attendableId?: string;
  mailbox?: Mailbox.Mailbox;
  viewMode: ViewMode;
  /** Ids of the expanded messages; every other message renders as a collapsed summary. */
  expanded: ReadonlySet<string>;
  onExpandedChange: (id: string, expanded: boolean) => void;
  onContactCreate: NonNullable<MessageHeaderProps['onContactCreate']>;
  /** Companion (peek) view: enables the per-message "open in main view" action. */
  companion?: boolean;
};

const ConversationStackContext = createContext<ConversationStackContextValue | undefined>(undefined);

const useConversationStack = (): ConversationStackContextValue => {
  const context = useContext(ConversationStackContext);
  if (!context) {
    throw new Error('`useConversationStack` must be used within `ConversationStack`.');
  }
  return context;
};

//
// ConversationStack
//

export type ConversationStackProps = ThemedClassName<{
  attendableId?: string;
  /** Messages/refs in chronological order; drafts interleaved by the connector. */
  items: MessageOrRef[];
  mailbox?: Mailbox.Mailbox;
  viewMode: ViewMode;
  /** Ids of the expanded messages; every other message renders as a collapsed summary. */
  expanded: ReadonlySet<string>;
  onExpandedChange: (id: string, expanded: boolean) => void;
  onContactCreate: NonNullable<MessageHeaderProps['onContactCreate']>;
  companion?: boolean;
  testId?: string;
}>;

/**
 * Renders an opened conversation (email thread) as a vertical Mosaic stack: one tile per message, each
 * with its own toolbar so reply/forward/delete act on that specific message. Reordering is disabled
 * (conversation order is chronological); view controls apply to the whole thread from the article's
 * {@link ConversationToolbar}. This is the thread-detail counterpart to the mailbox list `MessageStack`.
 */
export const ConversationStack = composable<HTMLDivElement, ConversationStackProps>(
  (
    {
      attendableId,
      items,
      mailbox,
      viewMode,
      expanded,
      onExpandedChange,
      onContactCreate,
      companion,
      testId,
      ...props
    },
    forwardedRef,
  ) => {
    const viewportRef = useRef<HTMLDivElement>(null);

    const tileItems = useMemo<ConversationTileData[]>(
      () => items.map((message) => ({ id: keyOf(message), message })),
      [items],
    );

    // Seeded with the initial tiles so drafts already present on mount aren't treated as newly appended.
    const seenIds = useRef<ReadonlySet<string>>(new Set(tileItems.map((item) => item.id)));

    const getId = useCallback((item: ConversationTileData) => item.id, []);

    // Smooth-scroll a newly-appended draft fully into view (its composer autofocuses once visible). A
    // reply draft renders directly after the message it answers, so it may be mid-thread — scroll to
    // it by id, aligning its bottom (`block: 'end'`) so the whole composer shows rather than just its
    // top. The composer mounts asynchronously and grows the tile, so re-pin its bottom via a
    // ResizeObserver for a short settle window; each smooth scroll retargets the previous one, so the
    // animation stays continuous as the tile grows rather than snapping at the end.
    useEffect(() => {
      const newDraft = tileItems.find((item) => !seenIds.current.has(item.id) && DraftMessage.instanceOf(item.message));
      seenIds.current = new Set(tileItems.map((item) => item.id));
      const tile = newDraft && viewportRef.current?.querySelector(`[data-object-id="${CSS.escape(newDraft.id)}"]`);
      if (!(tile instanceof HTMLElement)) {
        return;
      }

      const scrollIntoView = () => tile.scrollIntoView({ block: 'end', behavior: 'smooth' });
      scrollIntoView();
      const observer = new ResizeObserver(scrollIntoView);
      observer.observe(tile);
      const timeout = setTimeout(() => observer.disconnect(), 1_000);
      return () => {
        observer.disconnect();
        clearTimeout(timeout);
      };
    }, [tileItems]);

    const contextValue = useMemo<ConversationStackContextValue>(
      () => ({ attendableId, mailbox, viewMode, expanded, onExpandedChange, onContactCreate, companion }),
      [attendableId, mailbox, viewMode, expanded, onExpandedChange, onContactCreate, companion],
    );

    return (
      <ConversationStackContext.Provider value={contextValue}>
        <Mosaic.Container asChild orientation='vertical'>
          <ScrollArea.Root
            {...composableProps(props)}
            orientation='vertical'
            centered
            padding
            thin
            data-testid={testId}
            ref={forwardedRef}
          >
            <ScrollArea.Viewport ref={viewportRef}>
              <Mosaic.Stack
                classNames='dx-document gap-2 pbs-2'
                items={tileItems}
                getId={getId}
                draggable={false}
                Tile={ConversationMessageTile}
              />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Mosaic.Container>
      </ConversationStackContext.Provider>
    );
  },
);

ConversationStack.displayName = 'ConversationStack';

//
// Tile
//

/** Mosaic tile chrome; dispatches to the draft composer or the read-message body. */
const ConversationMessageTile: FC<MosaicTileProps<ConversationTileData>> = ({ data, ...tileProps }) => {
  const { id, message } = data;
  return (
    <Mosaic.Tile
      {...tileProps}
      data={data}
      classNames='dx-attention-surface border border-subdued-separator rounded overflow-hidden'
    >
      {DraftMessage.instanceOf(message) ? (
        <DraftTile id={id} message={message} />
      ) : (
        <ReadTile id={id} message={message} />
      )}
    </Mosaic.Tile>
  );
};

ConversationMessageTile.displayName = 'ConversationMessageTile';

type ReadTileProps = {
  id: string;
  message: MessageOrRef;
};

/**
 * A read message in the conversation stack. Owns its own subscription (via `useObject`) so reactivity
 * stays granular, and builds reply/forward/delete handlers bound to this message rather than the thread.
 */
const ReadTile = ({ id, message: messageOrRef }: ReadTileProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { attendableId, mailbox, viewMode, expanded, onExpandedChange, onContactCreate, companion } =
    useConversationStack();
  // The snapshot drives reactive body/header rendering; the live object (already the item, or the ref's
  // resolved target) drives handlers and the summary, which need a real `Message` for the operations.
  const [message] = useObject(messageOrRef);
  const target = Ref.isRef(messageOrRef) ? messageOrRef.target : messageOrRef;
  const db = mailbox ? Obj.getDatabase(mailbox) : undefined;
  const sender = useActorContact(db, message?.sender);
  const handlers = useMessageHandlers(target, mailbox, companion);
  const isExpanded = expanded.has(id);

  // Collapse when the toolbar's empty area is clicked; the action buttons (reply/overflow) keep their
  // own clicks. `closest` handles clicks that land on an icon (SVG) inside a button.
  const handleToolbarClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const clicked = event.target;
      if (clicked instanceof Element && clicked.closest('button,[role="menuitem"],a,input,select,textarea')) {
        return;
      }
      onExpandedChange(id, false);
    },
    [id, onExpandedChange],
  );

  // Keyboard equivalent of `handleToolbarClick`: only fires when the div itself is focused (not a
  // bubbled key from one of its button/menuitem children, which handle their own activation).
  const handleToolbarKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) {
        return;
      }
      event.preventDefault();
      onExpandedChange(id, false);
    },
    [id, onExpandedChange],
  );

  if (!message || !target) {
    return null;
  }

  // Collapsed messages render a compact two-line summary (Gmail-style) with no `Message.Root` overhead;
  // the whole card is the expand affordance (implicit accordion).
  if (!isExpanded) {
    return <CollapsedCard message={target} onExpand={() => onExpandedChange(id, true)} />;
  }

  return (
    <Message.Root
      attendableId={attendableId}
      viewMode={viewMode}
      message={message}
      mailbox={mailbox}
      sender={sender}
      {...handlers}
    >
      {/* Clicking the toolbar's empty area collapses the message (implicit accordion); `justify-end`
          keeps the Reply All button and overflow menu at the trailing end. */}
      <div
        className='flex items-center border-be border-subdued-separator cursor-pointer'
        data-testid='message.collapse'
        role='button'
        tabIndex={0}
        aria-label={t('message-toolbar-collapse.label')}
        onClick={handleToolbarClick}
        onKeyDown={handleToolbarKeyDown}
      >
        <Message.Toolbar classNames='justify-end' />
      </div>
      <Message.Header onContactCreate={onContactCreate} />
      <Message.Body />
    </Message.Root>
  );
};

ReadTile.displayName = 'ReadTile';

type CollapsedCardProps = {
  message: MessageType.Message;
  onExpand: () => void;
};

/**
 * A collapsed message: a two-line summary (sender + snippet) beside the sender's avatar, so a folded
 * thread still reads as a scannable history. Rendered as a `Listbox` row whose click expands the
 * message (single-item list — the enclosing Mosaic tile owns the outer chrome).
 */
const CollapsedCard = ({ message, onExpand }: CollapsedCardProps) => {
  const { from, date, snippet, subject, hue } = getMessageProps(message);
  const name = from ?? message.sender?.email ?? '';

  return (
    <Listbox.Root>
      <Listbox.Content aria-label={subject}>
        <Listbox.Item id={message.id} onClick={onExpand} data-testid='message.expand' classNames='gap-3'>
          <DxAvatar hue={hue} hueVariant='surface' variant='square' size={9} fallback={name} />
          <Listbox.ItemContent title={name} description={snippet} />
          <span className='whitespace-nowrap text-sm text-description'>{date}</span>
        </Listbox.Item>
      </Listbox.Content>
    </Listbox.Root>
  );
};

CollapsedCard.displayName = 'CollapsedCard';

type DraftTileProps = {
  id: string;
  message: MessageType.Message;
};

/**
 * A draft in the conversation stack. Re-resolves its own live, persisting object by id: the object in
 * the connector's ordered/windowed query is index-hydrated and detached (`Obj.update` on it silently
 * no-ops), so editing it wouldn't persist. Rendering waits for the live object so the composer's
 * uncontrolled editor initializes from the persisted body rather than the stale thread copy.
 */
const DraftTile = ({ id, message }: DraftTileProps) => {
  const { mailbox } = useConversationStack();
  const db = mailbox ? Obj.getDatabase(mailbox) : Obj.getDatabase(message);
  const live = useQuery(db, Filter.id(message.id))[0];
  if (!live) {
    return null;
  }

  return <DraftTileContent id={id} message={live} />;
};

DraftTile.displayName = 'DraftTile';

// Stable fallback while the mailbox tag index is unresolved, so the tag-uris atom is unconditional.
const EMPTY_TAG_URIS_ATOM = Atom.make<string[]>(() => []);

/**
 * Renders a resolved live draft: the inline composer while unsent, locking to the read-only tile once
 * the provider's sent tag is applied (on send) — reactively, via the tag-index membership — until the
 * sync reconciliation stage swaps in the canonical feed message.
 */
const DraftTileContent = ({ id, message }: DraftTileProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { mailbox } = useConversationStack();
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
    return <ReadTile id={id} message={message} />;
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

DraftTileContent.displayName = 'DraftTileContent';

/**
 * Builds the per-message action handlers. Every handler targets its own `message` (not the newest
 * message in the thread), so each tile's Reply/Forward/Delete acts on the message it renders.
 */
const useMessageHandlers = (
  message: MessageType.Message | undefined,
  mailbox: Mailbox.Mailbox | undefined,
  companion?: boolean,
): ConversationMessageHandlers => {
  const { invokePromise } = useOperationInvoker();
  const db = message ? Obj.getDatabase(message) : undefined;

  const openDraft = useCallback(
    (mode: 'reply' | 'reply-all' | 'forward') => {
      // Add the draft directly; it shares the thread's `threadId`, so the `mailboxMessage` connector
      // query picks it up reactively and renders it inline — no navigation, no operation needed.
      if (db && message) {
        const draft = db.add(DraftMessage.make(createDraftMessage({ mode, message, mailbox })));
        // Tag it like every other draft-creation path (`DraftEmailAndOpen`); `useSendEmail` removes
        // this tag at send time. A brand-new draft never already carries a tag, so `toggleTag` (the
        // same mechanism 'starred' uses) always applies it here.
        if (mailbox) {
          void SystemTags.toggleTag(mailbox, draft, db, 'draft');
        }
      }
    },
    [db, message, mailbox],
  );
  const onReply = useCallback(() => openDraft('reply'), [openDraft]);
  const onReplyAll = useCallback(() => openDraft('reply-all'), [openDraft]);
  const onForward = useCallback(() => openDraft('forward'), [openDraft]);

  // AI reply: generate a grounded body first (thread + facts), then open the reply draft prefilled.
  // `spaceId` scopes the spawned operation so its space-affinity services (Database/FactStore) resolve.
  const onAiReply = useCallback(async () => {
    if (!db || !mailbox || !message) {
      return;
    }
    try {
      const result = await invokePromise(
        InboxOperation.GenerateReply,
        { mailbox: Ref.make(mailbox), message },
        { spaceId: db.spaceId },
      );
      void invokePromise(InboxOperation.DraftEmailAndOpen, {
        db,
        mode: 'reply',
        message,
        mailbox,
        body: result?.data?.body,
      });
    } catch (err) {
      // Reply generation calls an LLM that can fail; fall back to opening an empty reply draft so the
      // action never leaves the user without a draft (and never leaks an unhandled rejection).
      log.catch(err);
      void invokePromise(InboxOperation.DraftEmailAndOpen, { db, mode: 'reply', message, mailbox });
    }
  }, [db, invokePromise, message, mailbox]);

  // Delete the message (draft locally; synced message is trashed upstream and removed from the feed).
  // `spaceId` scopes the spawned operation process so its space-affinity services materialize.
  const onDelete = useCallback(() => {
    if (mailbox && message) {
      void invokePromise(InboxOperation.DeleteEmail, { mailbox, message }, { spaceId: db?.spaceId });
    }
  }, [invokePromise, db, mailbox, message]);

  const onOpen = useCallback(() => {
    if (!mailbox || !db || !message) {
      return;
    }
    void invokePromise(LayoutOperation.Open, {
      subject: [getMailboxMessagePath(db.spaceId, mailbox.id, message.id)],
    });
  }, [mailbox, db, message, invokePromise]);

  return {
    onOpen: companion && mailbox ? onOpen : undefined,
    onReply,
    onReplyAll,
    onForward,
    onAiReply: mailbox ? onAiReply : undefined,
    onDelete: mailbox ? onDelete : undefined,
  };
};

//
// ConversationToolbar
//

// Fallback used when the optional InboxCapabilities.Settings capability is not installed (e.g. in
// standalone storybook contexts). Keeps the toolbar renderable without the plugin manager.
const FALLBACK_SETTINGS_ATOM = Atom.make({ loadRemoteImages: false });

type UseThreadViewActionsProps = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  loadRemoteImages: boolean;
  onToggleLoadImages: () => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
};

// Thread-scoped controls: the view-mode switch and load-images toggle apply to every body at once,
// collapse-all/expand-all fold or unfold every message. Per-message actions live on each tile's toolbar.
const useThreadViewActions = ({
  viewMode,
  setViewMode,
  loadRemoteImages,
  onToggleLoadImages,
  onCollapseAll,
  onExpandAll,
}: UseThreadViewActionsProps) =>
  useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['conversation-toolbar.label', { ns: meta.profile.key }] })
        .subgraph(viewModeGroup({ ns: meta.profile.key, viewMode, setViewMode }))
        .subgraph((builder) =>
          builder.action(
            'load-images',
            {
              label: ['message-toolbar-load-images.menu', { ns: meta.profile.key }],
              icon: loadRemoteImages ? 'ph--image--regular' : 'ph--image-broken--regular',
              iconOnly: true,
              checked: loadRemoteImages,
            },
            onToggleLoadImages,
          ),
        )
        .separator('gap')
        .subgraph((builder) =>
          builder.action(
            'collapse-all',
            {
              label: ['collapse-all.menu', { ns: meta.profile.key }],
              icon: 'ph--arrows-in-line-vertical--regular',
              iconOnly: true,
            },
            onCollapseAll,
          ),
        )
        .subgraph((builder) =>
          builder.action(
            'expand-all',
            {
              label: ['expand-all.menu', { ns: meta.profile.key }],
              icon: 'ph--arrows-out-line-vertical--regular',
              iconOnly: true,
            },
            onExpandAll,
          ),
        )
        .build(),
    [viewMode, setViewMode, loadRemoteImages, onToggleLoadImages, onCollapseAll, onExpandAll],
  );

export type ConversationToolbarProps = ThemedClassName<{
  attendableId?: string;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
}>;

/** The whole-thread toolbar: body view controls + collapse-all/expand-all, mounted once at the top. */
export const ConversationToolbar = composable<HTMLDivElement, ConversationToolbarProps>(
  ({ attendableId, viewMode, setViewMode, onCollapseAll, onExpandAll, ...props }, forwardedRef) => {
    const settingsAtoms = useCapabilities(InboxCapabilities.Settings);
    const settingsAtom = settingsAtoms[0] ?? FALLBACK_SETTINGS_ATOM;
    const settings = useAtomValue(settingsAtom);
    const setSettings = useAtomSet(settingsAtom);
    const loadRemoteImages = settings.loadRemoteImages ?? false;
    const onToggleLoadImages = useCallback(
      () => setSettings((prev) => ({ ...prev, loadRemoteImages: !(prev.loadRemoteImages ?? false) })),
      [setSettings],
    );

    const menuActions = useThreadViewActions({
      viewMode,
      setViewMode,
      loadRemoteImages,
      onToggleLoadImages,
      onCollapseAll,
      onExpandAll,
    });

    return (
      <Menu.Root {...menuActions} attendableId={attendableId} alwaysActive>
        <Menu.Toolbar {...composableProps(props)} ref={forwardedRef} />
      </Menu.Root>
    );
  },
);

ConversationToolbar.displayName = 'ConversationToolbar';
