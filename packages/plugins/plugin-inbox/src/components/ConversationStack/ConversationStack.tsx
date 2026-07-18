//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomSet, useAtomValue } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { type Capabilities } from '@dxos/app-framework';
import { type Graph } from '@dxos/app-graph';
import { Filter, Obj, Ref, Tag } from '@dxos/echo';
import { DxAvatar } from '@dxos/lit-ui/react';
import { normalizeText } from '@dxos/markdown';
import { useObject, useQuery, useResolveRef } from '@dxos/react-client/echo';
import { Card, ScrollArea, type ThemedClassName, composable, composableProps, useTranslation } from '@dxos/react-ui';
import { Menu, type MenuActions, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { TagIndex } from '@dxos/schema';
import { type Actor, ContentBlock, DraftMessage, type Message as MessageType } from '@dxos/types';

import { useEmailComposerExtensions, useMessageTags, useSendEmail } from '#hooks';
import { meta } from '#meta';
import { Mailbox, SystemTags } from '#types';

import { createDraftMessage, getMessageProps } from '../../util';
import { EditMessage } from '../EditMessage';
import { HtmlViewer } from '../HtmlViewer';
import { MarkdownViewer } from '../MarkdownViewer';
import { Row } from '../Row';
import { type ViewMode, viewModeGroup } from '../ViewMode';
import { ExtractorMenuItem } from './useExtractorActions';
import { useMessageExtractedObjects } from './useMessageExtractedObjects';
import { useMessageActions } from './useToolbar';

//
// Types
//

type MessageOrRef = MessageType.Message | Ref.Ref<MessageType.Message>;

/** Stable id for a message or unresolved ref, keying tiles and collapse state. */
export const keyOf = (message: MessageOrRef): string =>
  Ref.isRef(message) ? String(message.uri) : Obj.getURI(message);

/**
 * Reactive view options for a rendered message (body render mode + image loading). Passed in as a
 * single atom so components read/write view state without knowing where it comes from; add future
 * view toggles here rather than as new props. The owner (container) seeds/persists it.
 */
export type MessageOptions = {
  viewMode: ViewMode;
  loadRemoteImages?: boolean;
};

/** Header interaction surface shared by the message header rows (kept as a named type for containers). */
export type MessageHeaderProps = {
  onContactCreate?: (actor: Actor.Actor) => void;
};

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

/** Per-message action callbacks the container builds from the operation invoker (the component holds no
 * invoker itself). Each targets a specific message. */
type ConversationMessageActions = {
  onAiReply?: (message: MessageType.Message) => void;
  onDelete?: (message: MessageType.Message) => void;
  onOpen?: (message: MessageType.Message) => void;
};

//
// Context
//

const MESSAGE_THREAD_NAME = 'MessageThread';

// State shared by every part and tile in the conversation. `options`/`expanded` and their setters are
// owned by the article (via `Root`) so the thread toolbar can drive them across all bodies at once; the
// per-tile handlers read the same context so reply/forward/delete act on the individual message.
type MessageThreadContextValue = {
  /** Single attendable id shared by every tile so the whole conversation is attended together. */
  attendableId?: string;
  mailbox?: Mailbox.Mailbox;
  /** Messages/refs in chronological order; drafts interleaved by the connector. */
  items: MessageOrRef[];
  /** Companion (peek) view: enables the per-message "open in main view" action. */
  companion?: boolean;
  /** Reactive view options (render mode, image loading); owned by the container, shared by every tile. */
  options: Atom.Writable<MessageOptions>;
  /** Ids of the expanded messages; every other message renders as a collapsed summary. */
  expanded: ReadonlySet<string>;
  onExpandedChange?: (id: string, expanded: boolean) => void;
  /** Folds every message (thread toolbar only). */
  onCollapseAll?: () => void;
  /** Unfolds every message (thread toolbar only). */
  onExpandAll?: () => void;
  onContactCreate?: MessageHeaderProps['onContactCreate'];

  /** App graph for contributed (`disposition: 'toolbar'`) actions (container-resolved). */
  graph?: Graph.ReadableGraph;
  /** Builds the extract menu items for a message (container-resolved from extractors + invoker). */
  getExtractActions?: (message: Mailbox.MessageLike) => ExtractorMenuItem[];
  /** Process-manager runtime for draft send / composer AI (container-resolved). */
  runtime?: Capabilities.ProcessManagerRuntime;
} & ConversationMessageActions;

const [MessageThreadProvider, useMessageThreadContext] = createContext<MessageThreadContextValue>(MESSAGE_THREAD_NAME);

//
// Root
//

const MESSAGE_THREAD_ROOT_NAME = 'MessageThread.Root';

export type MessageThreadRootProps = PropsWithChildren<
  Pick<
    MessageThreadContextValue,
    | 'attendableId'
    | 'mailbox'
    | 'items'
    | 'companion'
    | 'options'
    | 'expanded'
    | 'onExpandedChange'
    | 'onCollapseAll'
    | 'onExpandAll'
    | 'onContactCreate'
    | 'onAiReply'
    | 'onDelete'
    | 'onOpen'
    | 'graph'
    | 'getExtractActions'
    | 'runtime'
  >
>;

/**
 * Provides the shared conversation state to {@link MessageThreadToolbar} and {@link MessageThreadContent}
 * (and every message tile). Renders no DOM of its own, so it wraps the article's `Panel` — the toolbar
 * and content slot into `Panel.Toolbar` / `Panel.Content`.
 */
const MessageThreadRoot = ({
  children,
  attendableId,
  items,
  companion,
  expanded,
  mailbox,
  options,
  onExpandedChange,
  onCollapseAll,
  onExpandAll,
  onContactCreate,
  onAiReply,
  onDelete,
  onOpen,
  graph,
  getExtractActions,
  runtime,
}: MessageThreadRootProps) => (
  <MessageThreadProvider
    attendableId={attendableId}
    items={items}
    mailbox={mailbox}
    options={options}
    expanded={expanded}
    onExpandedChange={onExpandedChange}
    onCollapseAll={onCollapseAll}
    onExpandAll={onExpandAll}
    onContactCreate={onContactCreate}
    onAiReply={onAiReply}
    onDelete={onDelete}
    onOpen={onOpen}
    companion={companion}
    graph={graph}
    getExtractActions={getExtractActions}
    runtime={runtime}
  >
    {children}
  </MessageThreadProvider>
);

MessageThreadRoot.displayName = MESSAGE_THREAD_ROOT_NAME;

//
// Content
//

const MESSAGE_THREAD_CONTENT_NAME = 'MessageThread.Content';

export type MessageThreadContentProps = ThemedClassName<{ testId?: string }>;

/**
 * Renders the opened conversation (email thread) as a vertical Mosaic stack: one tile per message, each
 * with its own toolbar so reply/forward/delete act on that specific message. Reordering is disabled
 * (conversation order is chronological); view controls apply to the whole thread from the
 * {@link MessageThreadToolbar}. This is the thread-detail counterpart to the mailbox list `MessageStack`.
 */
const MessageThreadContent = composable<HTMLDivElement, MessageThreadContentProps>(
  ({ testId, ...props }, forwardedRef) => {
    const { items } = useMessageThreadContext(MESSAGE_THREAD_CONTENT_NAME);
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

    return (
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
    );
  },
);

MessageThreadContent.displayName = MESSAGE_THREAD_CONTENT_NAME;

//
// Message Tile
//

const MESSAGE_TILE_NAME = 'MessageThread.MessageTile';

/** Mosaic tile chrome; dispatches to the draft composer or the read-message body. */
const ConversationMessageTile = ({ data, ...tileProps }: MosaicTileProps<ConversationTileData>) => {
  const { id, message } = data;
  return (
    <Mosaic.Tile
      {...tileProps}
      data={data}
      classNames={[
        'dx-attention-surface border border-subdued-separator rounded overflow-hidden',
        MESSAGE_TILE_COLUMNS,
      ]}
    >
      {DraftMessage.instanceOf(message) ? (
        // The composer isn't column-aligned; span the whole tile.
        <div className='col-span-full'>
          <DraftTile id={id} message={message} />
        </div>
      ) : (
        <MessageTile id={id} message={message} />
      )}
    </Mosaic.Tile>
  );
};

ConversationMessageTile.displayName = MESSAGE_TILE_NAME;

//
// Message (read tile)
// https://www.radix-ui.com/primitives/docs/guides/composition
//
// `ConversationMessageTile` establishes the shared column template — avatar | title | date | menu — on the
// tile itself; `MessageTile` spans it with `grid-cols-subgrid` so its summary row and its expanded
// detail/body row share the exact same columns (avatar in column 1, date/menu pinned right).
//

const MESSAGE_TILE_COLUMNS_NAME = 'MessageThread.MessageTile.Columns';

/** Column template established by the tile; message parts subgrid into it. */
const MESSAGE_TILE_COLUMNS = 'grid grid-cols-[auto_1fr_auto]';

type MessageTileProps = {
  id: string;
  message: MessageOrRef;
};

/**
 * A read message in the conversation stack. Owns its own subscription (via `useObject`) so reactivity
 * stays granular, and builds reply/forward/delete handlers bound to this message rather than the thread.
 */
const MessageTile = ({ id, message: messageOrRef }: MessageTileProps) => {
  const {
    attendableId,
    mailbox,
    options,
    expanded,
    companion,
    graph,
    getExtractActions,
    onAiReply,
    onDelete,
    onOpen,
    onExpandedChange,
    onContactCreate,
  } = useMessageThreadContext(MESSAGE_TILE_NAME);
  // The snapshot drives reactive body/header rendering; the live object (already the item, or the ref's
  // resolved target) drives handlers and the menu, which need a real `Message` for the operations.
  const [message] = useObject(messageOrRef);
  const target = Ref.isRef(messageOrRef) ? messageOrRef.target : messageOrRef;
  const handlers = useMessageHandlers(target, mailbox, companion, { onAiReply, onDelete, onOpen });

  // Assemble the per-message toolbar menu here, from the message handlers plus the container-resolved
  // graph + extract actions.
  const extractActions = useMemo(
    () => (target ? (getExtractActions?.(target) ?? []) : []),
    [getExtractActions, target],
  );
  const menuActions = useMessageActions({ graph, extractActions, nodeId: attendableId, ...handlers });

  const isExpanded = expanded.has(id);
  if (!message || !target) {
    return null;
  }

  const { from, to, date, snippet, subject, hue } = getMessageProps(target);
  const sender = from ?? target.sender?.email ?? '';

  // One subgrid spanning the tile's columns, so the summary row and the detail/body row share them.
  return (
    <div className='contents'>
      <div className='col-span-full grid grid-cols-subgrid items-start'>
        {/* Summary row: avatar (col 1) | title (col 2) | date + star (col 3) | menu (col 4). */}
        <div className='p-2'>
          <DxAvatar hue={hue} hueVariant='surface' variant='circle' size={9} fallback={sender} />
        </div>

        <div className='col-start-2 flex flex-col py-1'>
          <h2
            className='text-lg line-clamp-2 min-w-0 cursor-pointer'
            data-testid={isExpanded ? undefined : 'message.expand'}
            onClick={() => onExpandedChange?.(id, !isExpanded)}
          >
            {sender}
          </h2>
          {isExpanded ? (
            <>
              {subject && <div className='font-medium line-clamp-2'>{subject}</div>}
              {to && <div className='text-sm text-description'>{to}</div>}
            </>
          ) : (
            <div className='text-sm text-description line-clamp-1'>{snippet}</div>
          )}
        </div>

        <div className='col-start-3 flex items-center'>
          <span className=' p-2 whitespace-nowrap text-sm text-description'>{date}</span>
          {isExpanded && (
            <>
              {mailbox && (
                <div className='p-1'>
                  <MessageStar message={target} mailbox={mailbox} />
                </div>
              )}
              <MessageMenu attendableId={attendableId} actions={menuActions} />
            </>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className='col-span-full grid grid-cols-subgrid items-start'>
          <div className='col-start-2 col-span-3 flex flex-col gap-1 min-w-0 pe-3'>
            {/* <MessageDetails message={message} mailbox={mailbox} onContactCreate={onContactCreate} /> */}
            <MessageBody message={message} mailbox={mailbox} options={options} />
          </div>
        </div>
      )}
    </div>
  );
};

MessageTile.displayName = MESSAGE_TILE_NAME;

//
// Message parts (internal)
//

const MESSAGE_STAR_NAME = 'MessageThread.MessageStar';

// Stable fallback so `useAtomValue` always receives an atom when the message isn't starrable.
const NOT_STARRED = Atom.make(false);

type MessageStarProps = {
  message: MessageType.Message;
  mailbox: Mailbox.Mailbox;
};

/** Star toggle backed by the mailbox tag index (membership-scoped reactivity). */
const MessageStar = ({ message, mailbox }: MessageStarProps) => {
  const db = Obj.getDatabase(mailbox);
  const starredTag = useQuery(db, Filter.foreignKeys(Tag.Tag, [SystemTags.systemTagKey('starred')]))[0];
  const starredUri = starredTag && Obj.getURI(starredTag).toString();
  const tagIndex = mailbox.tags?.target;
  const starredAtom = useMemo(
    () => (tagIndex && starredUri ? TagIndex.atom(tagIndex, message.id, starredUri) : NOT_STARRED),
    [tagIndex, message.id, starredUri],
  );
  const starred = useAtomValue(starredAtom);
  const handleToggleStar = useCallback(() => {
    if (db) {
      void SystemTags.toggleTag(mailbox, message, db, 'starred');
    }
  }, [mailbox, message, db]);

  return <Row.Star starred={starred} onToggle={handleToggleStar} />;
};

MessageStar.displayName = MESSAGE_STAR_NAME;

//
// Message Details
//

const MESSAGE_DETAILS_NAME = 'MessageThread.MessageDetails';

type MessageDetailsProps = {
  message: Mailbox.MessageLike;
  mailbox?: Mailbox.Mailbox;
  onContactCreate?: MessageHeaderProps['onContactCreate'];
};

/** Sender, extracted-object relations, attachments and tags — the header detail rows below the subject. */
const MessageDetails = ({ message, mailbox, onContactCreate }: MessageDetailsProps) => {
  const db = Obj.getDatabase(message);

  // `useQuery` only fires when the matching set changes, not when nested fields mutate. Subscribe to the
  // owning mailbox so a tag-only extractor run (no created objects, just a `mailbox.tags`/`extracted`
  // mutation) still re-renders.
  const [, bump] = useReducer((tick: number) => tick + 1, 0);
  useEffect(() => {
    if (!mailbox) {
      return;
    }

    return Obj.subscribe(mailbox, bump);
  }, [mailbox]);

  // Resolve the message's tag uris (from the Mailbox tag index) to Tag objects for label/hue.
  const tagObjects = useQuery(db, Filter.type(Tag.Tag));
  const messageTags = useMessageTags(mailbox, message, tagObjects);

  // Extracted objects — trips, people, etc.
  const objects = useMessageExtractedObjects(db, mailbox, message);

  return (
    <Card.Root border={false} fullWidth>
      <Card.Body>
        {/* TODO(burdon): List other To/CC/BCC (Message schema only models `sender` today). */}
        {/* <Row.Person actor={message.sender} role='from' db={db} onContactCreate={onContactCreate} /> */}

        {/* Per-relation rows — one per ECHO object the message produced (Trip, Person, …). */}
        {objects.map((object) => (
          <Row.Ref key={Obj.getURI(object).toString()} object={object} />
        ))}

        {/* Attachments row. */}
        <Row.Attachments attachments={message.attachments} />

        {/* Tags row — Gmail-synced provider labels and user-applied tags. */}
        <Row.Tags tags={messageTags} />
      </Card.Body>
    </Card.Root>
  );
};

MessageDetails.displayName = MESSAGE_DETAILS_NAME;

//
// Message Body
//

const MESSAGE_BODY_NAME = 'MessageThread.MessageBody';

type MessageBodyProps = {
  message: Mailbox.MessageLike;
  mailbox?: Mailbox.Mailbox;
  options: Atom.Writable<MessageOptions>;
};

/** The message body — raw email HTML (default) or the markdown/plain rendering. */
const MessageBody = ({ message, mailbox, options }: MessageBodyProps) => {
  const { viewMode, loadRemoteImages = false } = useAtomValue(options);

  // Person-to-person mail carries a provider "personal" tag (e.g. Gmail's "Personal" category,
  // persisted into the mailbox tag index during label sync); used to decide how aggressively the
  // HTML view restyles the body.
  const db = Obj.getDatabase(mailbox ?? message);
  const personalTag = useQuery(db, Filter.foreignKeys(Tag.Tag, [SystemTags.systemTagKey('personal')]))[0];
  const isPersonal = useMemo(
    () =>
      !!(mailbox && personalTag && Mailbox.getTagsForMessage(mailbox, message).includes(Mailbox.tagUri(personalTag))),
    [mailbox, message, personalTag],
  );

  // Content blocks are typed by mimeType: `text/html` (raw email HTML), `text/markdown` (an authored
  // markdown rendering), `text/plain` or untyped (plaintext). The markdown view prefers an authored
  // markdown block, else converts the HTML in-memory, else falls back to the plaintext.
  const { html, markdown } = useMemo(() => {
    const textBlocks = message.blocks.filter((block): block is ContentBlock.Text => block._tag === 'text');
    const htmlText = textBlocks.find((block) => block.mimeType === 'text/html')?.text ?? '';
    const markdownBlock = textBlocks.find((block) => block.mimeType === 'text/markdown')?.text;
    const plainText = textBlocks.find((block) => block.mimeType == null || block.mimeType === 'text/plain')?.text ?? '';
    return { html: htmlText, markdown: markdownBlock ?? (htmlText ? normalizeText(htmlText) : plainText) };
  }, [message.blocks]);

  // The HTML view needs an html block; without one (e.g. a markdown-only body) fall through to the
  // markdown renderer.
  if (viewMode === 'html' && html) {
    return (
      <HtmlViewer
        html={html}
        loadRemoteImages={loadRemoteImages}
        isPersonal={isPersonal}
        attachments={message.attachments}
        db={db}
      />
    );
  }

  return <MarkdownViewer content={markdown} markdown={viewMode !== 'plain'} loadRemoteImages={loadRemoteImages} />;
};

MessageBody.displayName = MESSAGE_BODY_NAME;

//
// Message Menu
//

const MESSAGE_MENU_NAME = 'MessageThread.MessageMenu';

type MessageMenuProps = {
  attendableId?: string;
  actions?: MenuActions;
};

/** Per-message toolbar menu (reply/forward/delete/extract), built by the tile and rendered top-right. */
const MessageMenu = ({ attendableId, actions }: MessageMenuProps) => (
  <Menu.Root {...(actions ?? {})} attendableId={attendableId} alwaysActive>
    <Menu.Toolbar classNames='p-1 bg-transparent' />
  </Menu.Root>
);

MessageMenu.displayName = MESSAGE_MENU_NAME;

//
// Message Handlers
//

/**
 * Builds the per-message action handlers bound to `message`. Reply/forward/reply-all are pure ECHO
 * (`db.add` a draft), so they stay here; the invoker-backed actions (AI reply, delete, open-in-main)
 * are container-provided callbacks — the component only binds them to its own message.
 */
const useMessageHandlers = (
  message: MessageType.Message | undefined,
  mailbox: Mailbox.Mailbox | undefined,
  companion: boolean | undefined,
  { onAiReply, onDelete, onOpen }: ConversationMessageActions,
): ConversationMessageHandlers => {
  const db = message ? Obj.getDatabase(message) : undefined;

  const openDraft = useCallback(
    (mode: 'reply' | 'reply-all' | 'forward') => {
      // Add the draft directly; it shares the thread's `threadId`, so the `mailboxMessage` connector
      // query picks it up reactively and renders it inline — no navigation, no operation needed.
      if (db && message) {
        db.add(DraftMessage.make(createDraftMessage({ mode, message, mailbox })));
      }
    },
    [db, message, mailbox],
  );
  const onReply = useCallback(() => openDraft('reply'), [openDraft]);
  const onReplyAll = useCallback(() => openDraft('reply-all'), [openDraft]);
  const onForward = useCallback(() => openDraft('forward'), [openDraft]);

  return {
    onReply,
    onReplyAll,
    onForward,
    onOpen: companion && mailbox && message && onOpen ? () => onOpen(message) : undefined,
    onAiReply: mailbox && message && onAiReply ? () => onAiReply(message) : undefined,
    onDelete: mailbox && message && onDelete ? () => onDelete(message) : undefined,
  };
};

//
// Draft
//

const MESSAGE_DRAFT_NAME = 'MessageThread.Draft';

// Stable fallback while the mailbox tag index is unresolved, so the tag-uris atom is unconditional.
const EMPTY_TAG_URIS_ATOM = Atom.make<string[]>(() => []);

type DraftTileProps = {
  id: string;
  message: MessageType.Message;
};

/**
 * A draft in the conversation stack: the inline composer while unsent, locking to the read-only tile
 * once the provider's sent tag is applied (on send) — reactively, via the tag-index membership — until
 * the sync reconciliation stage swaps in the canonical feed message.
 *
 * Re-resolves its own live, persisting object by id: the object in the connector's ordered/windowed
 * query is index-hydrated and detached (`Obj.update` on it silently no-ops), so editing it wouldn't
 * persist. Rendering waits for the live object so the composer's uncontrolled editor initializes from
 * the persisted body rather than the stale thread copy. Hooks run against `live ?? message` (the prop is
 * always defined) so they stay unconditional while the live object resolves.
 */
const DraftTile = ({ id, message }: DraftTileProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { mailbox, runtime, onDelete } = useMessageThreadContext(MESSAGE_DRAFT_NAME);
  const db = Obj.getDatabase(mailbox ? mailbox : message);
  const live = useQuery(db, Filter.id(message.id))[0];
  const draft = live ?? message;
  const extensions = useEmailComposerExtensions(runtime, draft);
  const onSend = useSendEmail(runtime, draft);

  // Sent once the draft carries the provider sent tag `useSendEmail` recorded on it (`sentTagUri`).
  // Read membership reactively from the tag index: the tag-uri list re-fires the instant the tag is
  // applied on send, whereas reading the message property alone would not.
  const tagIndex = useResolveRef(mailbox?.tags);
  const tagUrisAtom = useMemo(
    () => (tagIndex ? TagIndex.atom(tagIndex)(message.id) : EMPTY_TAG_URIS_ATOM),
    [tagIndex, message.id],
  );
  const tagUris = useAtomValue(tagUrisAtom);
  const handleDelete = useCallback(() => onDelete?.(draft), [onDelete, draft]);

  // Wait for the live object before editing (see above).
  if (!live) {
    return null;
  }

  const sentTagUri = live.properties?.sentTagUri;
  const sent = typeof sentTagUri === 'string' && tagUris.includes(sentTagUri);
  if (sent) {
    return <MessageTile id={id} message={live} />;
  }

  return (
    <EditMessage
      message={live}
      extensions={extensions}
      onSend={onSend}
      title={t('draft-message.title')}
      onDelete={mailbox && onDelete ? handleDelete : undefined}
    />
  );
};

DraftTile.displayName = MESSAGE_DRAFT_NAME;

//
// Toolbar
//

type UseThreadViewActionsProps = {
  options: Atom.Writable<MessageOptions>;
  onCollapseAll?: () => void;
  onExpandAll?: () => void;
};

// Thread-scoped controls: the view-mode switch and load-images toggle apply to every body at once,
// collapse-all/expand-all fold or unfold every message. Per-message actions live on each tile's menu.
// Reads/writes the shared `options` atom directly rather than taking derived values + setters.
const useThreadViewActions = ({ options, onCollapseAll, onExpandAll }: UseThreadViewActionsProps) => {
  const { viewMode, loadRemoteImages = false } = useAtomValue(options);
  const setOptions = useAtomSet(options);
  const setViewMode = useCallback(
    (mode: ViewMode) => setOptions((prev) => ({ ...prev, viewMode: mode })),
    [setOptions],
  );
  const onToggleLoadImages = useCallback(
    () => setOptions((prev) => ({ ...prev, loadRemoteImages: !(prev.loadRemoteImages ?? false) })),
    [setOptions],
  );

  return useMenuBuilder(
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
        .subgraph(
          onCollapseAll
            ? (builder) =>
                builder.action(
                  'collapse-all',
                  {
                    label: ['collapse-all.menu', { ns: meta.profile.key }],
                    icon: 'ph--arrows-in-line-vertical--regular',
                    iconOnly: true,
                  },
                  onCollapseAll,
                )
            : null,
        )
        .subgraph(
          onExpandAll
            ? (builder) =>
                builder.action(
                  'expand-all',
                  {
                    label: ['expand-all.menu', { ns: meta.profile.key }],
                    icon: 'ph--arrows-out-line-vertical--regular',
                    iconOnly: true,
                  },
                  onExpandAll,
                )
            : null,
        )
        .build(),
    [viewMode, setViewMode, loadRemoteImages, onToggleLoadImages, onCollapseAll, onExpandAll],
  );
};

//
// Message Thread Toolbar
//

const MESSAGE_THREAD_TOOLBAR_NAME = 'MessageThread.Toolbar';

export type MessageThreadToolbarProps = ThemedClassName;

const MessageThreadToolbar = composable<HTMLDivElement, MessageThreadToolbarProps>((props, forwardedRef) => {
  const { attendableId, options, onCollapseAll, onExpandAll } = useMessageThreadContext(MESSAGE_THREAD_TOOLBAR_NAME);
  const menuActions = useThreadViewActions({ options, onCollapseAll, onExpandAll });

  return (
    <Menu.Root {...menuActions} attendableId={attendableId} alwaysActive>
      <Menu.Toolbar {...composableProps(props)} ref={forwardedRef} />
    </Menu.Root>
  );
});

MessageThreadToolbar.displayName = MESSAGE_THREAD_TOOLBAR_NAME;

//
// MessageThread
//

export const MessageThread = {
  Root: MessageThreadRoot,
  Toolbar: MessageThreadToolbar,
  Content: MessageThreadContent,
  Message: MessageTile,
  Draft: DraftTile,
};
