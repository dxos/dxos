//
// Copyright 2026 DXOS.org
//

import { useAtomSet, useAtomValue } from '@effect/atom-react/Hooks';
import { createContext } from '@radix-ui/react-context';
import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import type * as AppGraph from '@dxos/app-graph/AppGraph';
import { Database, Filter, Obj, Ref, Tag } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import { normalizeText } from '@dxos/markdown';
import {
  Card,
  Collapsible,
  Icon,
  ScrollArea,
  type ThemedClassName,
  composable,
  composableProps,
  useTranslation,
} from '@dxos/react-ui';
import { Avatar, ContactAvatar, Row } from '@dxos/react-ui-card';
import { Html, emailDialect } from '@dxos/react-ui-components';
import { Menu, type MenuActions, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { TagIndex } from '@dxos/schema';
import { type Actor, ContentBlock, DraftMessage, type Message as MessageType } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { useCidResolver, useEmailComposerExtensions, useMessageTags, useSendEmail } from '#hooks';
import { meta } from '#meta';
import { InboxCapabilities, Mailbox, SystemTags } from '#types';

import { parseAddressList } from '../../operations/correspondents/correspondence';
import { createDraftMessage, formatAge, getMessageProps } from '../../util';
import { EditMessage } from '../EditMessage';
import { MarkdownViewer } from '../MarkdownViewer';
import { type ViewMode, viewModeGroup } from '../ViewMode';
import { keyOf } from './key-of';
import { ExtractorMenuItem } from './useExtractorActions';
import { useMessageExtractedObjects } from './useMessageExtractedObjects';
import { useMessageActions } from './useToolbar';

//
// Types
//

export type MessageOrRef = MessageType.Message | Ref.Ref<MessageType.Message>;

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
  /** Creates a tracking Project from the message (container-invoked; the component holds no invoker). */
  onCreateProject?: (message: MessageType.Message) => void;
  /** Opens one of the message's attachments (by index) in its own plank. */
  onOpenAttachment?: (message: Mailbox.MessageLike, index: number) => void;
  /**
   * Fired after a message is archived (never on restore). The tag toggle itself is tile-local so
   * archiving works in every consumer; this is the container's hook for the layout consequence —
   * a dedicated message view has nothing left to show once its message leaves the inbox.
   */
  onArchived?: (message: MessageType.Message) => void;
};

//
// Context
//

const CONVERSATION_STACK_NAME = 'ConversationStack';

// State shared by every part and tile in the conversation. `options`/`expanded` and their setters are
// owned by the article (via `Root`) so the thread toolbar can drive them across all bodies at once; the
// per-tile handlers read the same context so reply/forward/delete act on the individual message.
type ConversationStackContextValue = {
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
  /** App graph for contributed (`disposition: 'toolbar'`) actions (container-resolved). */
  graph?: AppGraph.ReadableGraph;
  /** Process-manager runtime for draft send / composer AI (container-resolved). */
  runtime?: Capabilities.ProcessManagerRuntime;
  /** Send operation per installed mail provider, keyed by connector id (container-resolved). */
  sendOperations?: readonly InboxCapabilities.MailSendOperation[];
  /** Builds the extract menu items for a message (container-resolved from extractors + invoker). */
  getExtractActions?: (message: Mailbox.MessageLike) => ExtractorMenuItem[];
  /** Builds the sender-scoped menu items for a message (container-resolved from `SenderAction`). */
  getSenderActions?: (message: Mailbox.MessageLike) => ExtractorMenuItem[];
  /** Derived summaries keyed by message id (container-resolved from the mailbox's annotation feed). */
  summaries?: ReadonlyMap<string, string>;
  /** Summary of the conversation as a whole, rendered as the last tile in the stack. */
  conversationSummary?: Mailbox.ConversationSummary;
  onExpandedChange?: (id: string, expanded: boolean) => void;
  /** Folds every message (thread toolbar only). */
  onCollapseAll?: () => void;
  /** Unfolds every message (thread toolbar only). */
  onExpandAll?: () => void;
  onContactCreate?: MessageHeaderProps['onContactCreate'];
} & ConversationMessageActions;

const [ConversationStackProvider, useConversationStackContext] =
  createContext<ConversationStackContextValue>(CONVERSATION_STACK_NAME);

//
// Root
//

const CONVERSATION_STACK_ROOT_NAME = 'ConversationStack.Root';

export type ConversationStackRootProps = PropsWithChildren<
  Pick<
    ConversationStackContextValue,
    | 'attendableId'
    | 'mailbox'
    | 'items'
    | 'companion'
    | 'options'
    | 'expanded'
    | 'graph'
    | 'runtime'
    | 'sendOperations'
    | 'getExtractActions'
    | 'getSenderActions'
    | 'summaries'
    | 'conversationSummary'
    | 'onExpandedChange'
    | 'onCollapseAll'
    | 'onExpandAll'
    | 'onContactCreate'
    | 'onAiReply'
    | 'onDelete'
    | 'onOpen'
    | 'onArchived'
    | 'onCreateProject'
    | 'onOpenAttachment'
  >
>;

/**
 * Provides the shared conversation state to {@link ConversationStackToolbar} and {@link ConversationStackContent}
 * (and every message tile). Renders no DOM of its own, so it wraps the article's `Panel` — the toolbar
 * and content slot into `Panel.Toolbar` / `Panel.Content`.
 */
const ConversationStackRoot = ({
  children,
  attendableId,
  items,
  companion,
  expanded,
  mailbox,
  options,
  graph,
  runtime,
  sendOperations,
  getExtractActions,
  getSenderActions,
  summaries,
  conversationSummary,
  onExpandedChange,
  onCollapseAll,
  onExpandAll,
  onContactCreate,
  onAiReply,
  onDelete,
  onOpen,
  onArchived,
  onCreateProject,
  onOpenAttachment,
}: ConversationStackRootProps) => (
  <ConversationStackProvider
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
    onArchived={onArchived}
    onCreateProject={onCreateProject}
    onOpenAttachment={onOpenAttachment}
    companion={companion}
    graph={graph}
    getExtractActions={getExtractActions}
    getSenderActions={getSenderActions}
    summaries={summaries}
    conversationSummary={conversationSummary}
    runtime={runtime}
    sendOperations={sendOperations}
  >
    {children}
  </ConversationStackProvider>
);

ConversationStackRoot.displayName = CONVERSATION_STACK_ROOT_NAME;

//
// Content
//

const CONVERSATION_STACK_CONTENT_NAME = 'ConversationStack.Content';

export type ConversationStackContentProps = ThemedClassName<{ testId?: string }>;

/**
 * Renders the opened conversation (email thread) as a vertical Mosaic stack: one tile per message, each
 * with its own toolbar so reply/forward/delete act on that specific message. Reordering is disabled
 * (conversation order is chronological); view controls apply to the whole thread from the
 * {@link ConversationStackToolbar}. This is the thread-detail counterpart to the mailbox list `InboxStack`.
 */
const ConversationStackContent = composable<HTMLDivElement, ConversationStackContentProps>(
  ({ testId, ...props }, forwardedRef) => {
    const { items, conversationSummary } = useConversationStackContext(CONVERSATION_STACK_CONTENT_NAME);
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
      // Focus the reply's body editor (`.dx-expand` distinguishes it from the recipient editors,
      // which are CodeMirror too). The composer mounts asynchronously — watch the tile until the
      // editor appears, bounded by the same settle window as the scroll re-pinning below;
      // `preventScroll` keeps the focus from cutting the smooth scroll short.
      const focusBody = () => {
        const content = tile.querySelector<HTMLElement>('.dx-expand .cm-content');
        if (content) {
          content.focus({ preventScroll: true });
          focusObserver.disconnect();
        }
      };
      const focusObserver = new MutationObserver(focusBody);
      focusObserver.observe(tile, { childList: true, subtree: true });
      focusBody();
      const observer = new ResizeObserver(scrollIntoView);
      observer.observe(tile);
      const timeout = setTimeout(() => {
        observer.disconnect();
        focusObserver.disconnect();
      }, 1_000);
      return () => {
        observer.disconnect();
        focusObserver.disconnect();
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
              Tile={ConversationMessageTile}
              classNames='dx-document gap-2 py-2'
              items={tileItems}
              getId={getId}
              draggable={false}
            />
            {/* Outside the stack: the summary describes the conversation, not a message, so it must not
                be reorderable/selectable as a tile — but it shares the tile chrome and the document width. */}
            {conversationSummary && <ConversationSummaryTile summary={conversationSummary} />}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Mosaic.Container>
    );
  },
);

ConversationStackContent.displayName = CONVERSATION_STACK_CONTENT_NAME;

//
// Message Tile
//

/** Column template established by the tile; message parts subgrid into it. */
const MESSAGE_TILE_COLUMNS = 'grid grid-cols-[auto_1fr_auto]';

/**
 * Avatar footprint, which sets the width of column 1 — non-avatar tiles reserve the same gutter so
 * their content aligns with the senders and bodies. `DxAvatar` renders `size * 4` px, matching `w-9`;
 * `is-9` is not a real Tailwind utility (see the Slider regression guard).
 */
const MESSAGE_AVATAR_SIZE = 8;
const MESSAGE_AVATAR_GUTTER = 'w-8';

const MESSAGE_TILE_NAME = 'ConversationStack.MessageTile';

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
// Summary tile
//

const CONVERSATION_SUMMARY_TILE_NAME = 'ConversationStack.SummaryTile';

type ConversationSummaryTileProps = {
  summary: Mailbox.ConversationSummary;
};

/**
 * Display form of a model id: `com.anthropic.model.claude-haiku-4-5.default` reads as
 * `claude-haiku-4-5`. The full id is the reproducible one, so it stays as the title attribute.
 */
const modelLabel = (model: string): string => model.replace(/^.*\.model\./, '').replace(/\.default$/, '');

/**
 * The conversation's derived summary, as the last tile under the messages. Rendered as markdown: the
 * summarization pipeline writes `text/markdown` blocks.
 *
 * The header carries the summary's provenance (model + when it was derived), which is what tells a
 * reader whether it predates the newest replies — a summary is advisory, so it must be datable.
 */
const ConversationSummaryTile = ({ summary }: ConversationSummaryTileProps) => {
  const { t } = useTranslation(meta.profile.key);
  // Recomputed per render rather than ticked: the tile re-renders whenever the annotation feed does,
  // and an age this coarse does not warrant a timer.
  const age = formatAge(new Date(summary.created), new Date());
  return (
    <div
      role='complementary'
      aria-label={t('conversation-summary.title')}
      // Same column template and gutter width as a message tile, so the heading and text line up with
      // the senders and bodies above rather than starting at the tile edge.
      className={mx(
        'dx-document dx-attention-surface border border-subdued-separator rounded overflow-hidden mt-2',
        MESSAGE_TILE_COLUMNS,
      )}
      data-testid='conversation.summary'
    >
      <div className='p-2'>
        <div className={mx('flex items-center justify-center', MESSAGE_AVATAR_GUTTER)}>
          <Icon icon='ph--text-align-left--regular' size={5} classNames='text-subdued' />
        </div>
      </div>
      <div className='col-start-2 col-span-2 flex flex-col gap-1 min-w-0 py-2 pe-3'>
        <div className='flex items-baseline gap-2 text-sm text-description'>
          <h2 className='font-medium'>{t('conversation-summary.title')}</h2>
          <span className='text-subdued truncate' title={summary.model} data-testid='conversation.summary.provenance'>
            {summary.model ? t('summary-provenance.label', { model: modelLabel(summary.model), age }) : age}
          </span>
        </div>
        <MarkdownViewer content={summary.summary} />
      </div>
    </div>
  );
};

ConversationSummaryTile.displayName = CONVERSATION_SUMMARY_TILE_NAME;

//
// Message (read tile)
// https://www.radix-ui.com/primitives/docs/guides/composition
//
// `ConversationMessageTile` establishes the shared column template — avatar | title | date | menu — on the
// tile itself; `MessageTile` spans it with `grid-cols-subgrid` so its summary row and its expanded
// detail/body row share the exact same columns (avatar in column 1, date/menu pinned right).
//

const MESSAGE_TILE_COLUMNS_NAME = 'ConversationStack.MessageTile.Columns';

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
    getSenderActions,
    summaries,
    onAiReply,
    onDelete,
    onOpen,
    onArchived,
    onCreateProject,
    onExpandedChange,
    onContactCreate,
  } = useConversationStackContext(MESSAGE_TILE_NAME);
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
  const senderActions = useMemo(() => (target ? (getSenderActions?.(target) ?? []) : []), [getSenderActions, target]);
  const db = mailbox && Obj.getDatabase(mailbox);

  // Archiving is the `inbox` tag coming off (Gmail's model — INBOX is a label), so one toggle serves
  // both directions and membership picks the menu label.
  const [inInbox, toggleInbox] = useSystemTag(target, mailbox, 'inbox');
  const handleArchive = useCallback(() => {
    toggleInbox();
    // Only archiving is a layout event; restoring leaves the message right where the user is looking.
    if (inInbox && target) {
      onArchived?.(target);
    }
  }, [toggleInbox, inInbox, target, onArchived]);
  const handleCreateProject = useCallback(() => {
    if (target) {
      onCreateProject?.(target);
    }
  }, [onCreateProject, target]);

  const menuActions = useMessageActions({
    graph,
    extractActions,
    nodeId: attendableId,
    inInbox,
    // Without a db the toggle is a no-op, so offering an enabled action would be a dead affordance.
    onArchive: db && target ? handleArchive : undefined,
    onCreateProject: onCreateProject && target ? handleCreateProject : undefined,
    senderActions,
    ...handlers,
  });

  const isExpanded = expanded.has(id);
  if (!message || !target) {
    return null;
  }

  const { from, date, snippet, subject } = getMessageProps(target);
  const sender = from ?? target.sender?.email ?? '';
  // Derived by the summarization pipeline; absent for most messages, which is the normal case —
  // collapsed tiles fall back to the provider's snippet rather than showing an empty affordance.
  const summary = summaries?.get(target.id);

  // One subgrid spanning the tile's columns, so the summary row and the detail/body row share them.
  // `Collapsible.Root` takes over that same element rather than adding one — an element between the
  // tile and its rows would break the subgrid chain the columns depend on. A conversation of one
  // passes no `onExpandedChange`, which disables the machine: the heading keeps its box but stops
  // being a control, so there is no dead tab stop and nothing to fold.
  return (
    <Collapsible.Root
      asChild
      open={isExpanded}
      onOpenChange={onExpandedChange && ((open) => onExpandedChange(id, open))}
      disabled={!onExpandedChange}
      lazyMount
      unmountOnExit
    >
      <div className='contents'>
        <div className='col-span-full grid grid-cols-subgrid items-start pt-1'>
          {/* Summary row: avatar (col 1) | title (col 2) | date + star (col 3) | menu (col 4). */}
          {/* `db` (not `getContact`): a conversation holds few messages, so a query per tile is
            affordable here — unlike the virtualized mailbox list, which resolves the whole page at once. */}
          {/* Avatar centred on the title's FIRST line — the row is `items-start` (the title clamps to
            two lines), so centring against the whole block would leave the avatar hanging below the
            name it belongs to. The nesting mirrors the title column's own box: `py-1` on the OUTER
            element, then an unpadded `1lh` line box to centre within. Putting both on one element
            fails, because `h-[1lh]` is border-box and the padding then eats into the line height,
            leaving the avatar high by exactly that padding. */}
          <div className='px-2 py-1 text-lg'>
            <div className='flex items-center h-[1lh]'>
              <ContactAvatar
                actor={target.sender}
                role='from'
                db={db}
                size={MESSAGE_AVATAR_SIZE}
                onContactCreate={onContactCreate}
              />
            </div>
          </div>

          <div className='col-start-2 flex flex-col py-1'>
            {/* The accordion heading: a real heading wrapping the control that folds its section, so the
              thread reads as a list of sections rather than a list of clickable text. The clamp sits on
              the button, whose own line boxes it counts — on the heading it would see the button as one
              atomic box and clamp nothing. */}
            <h2 className='text-lg min-w-0'>
              <Collapsible.Trigger
                classNames='line-clamp-2'
                data-testid={onExpandedChange && !isExpanded ? 'message.expand' : undefined}
              >
                {sender}
              </Collapsible.Trigger>
            </h2>
            {/* One line in one fixed box whichever state the tile is in: a stack shows folded and open
                tiles at once, and a summary line shorter than a subject line makes the two read as
                different row heights. Pinned rather than merely clamped, so a message with no subject
                still holds the line. */}
            <div
              // `leading-6` last: `text-sm` carries a line height of its own, and the two states only
              // share a baseline if the line box is 24px in both.
              className={mx(isExpanded ? 'font-medium' : 'text-sm text-description', 'h-6 leading-6 line-clamp-1')}
              data-testid={!isExpanded && summary ? 'message.summary' : undefined}
            >
              {isExpanded ? subject : (summary ?? snippet)}
            </div>
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

        {/* `unmountOnExit` keeps a folded message's body out of the tree entirely, as the previous
          conditional did — a thread holds many messages and each body is a rendered document. */}
        <Collapsible.Content asChild>
          <div className='col-span-full grid grid-cols-subgrid items-start'>
            {/* MessageDetails renders a `subgrid` Card.Root, so it spans and aligns to the tile columns. */}
            <MessageDetails message={message} mailbox={mailbox} onContactCreate={onContactCreate} />
            <div className='col-start-2 col-span-3 flex flex-col gap-1 min-w-0 pb-1'>
              {/* The summary is not repeated here: an expanded message shows its body, and the
                conversation's summary is the last tile in the stack. */}
              <MessageBody message={message} mailbox={mailbox} options={options} />
            </div>
          </div>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
};

MessageTile.displayName = MESSAGE_TILE_NAME;

//
// Message parts (internal)
//

const MESSAGE_STAR_NAME = 'ConversationStack.MessageStar';

// Stable fallback so `useAtomValue` always receives an atom when the message isn't taggable.
const NOT_TAGGED = Atom.make(false);

/**
 * One message's membership of a canonical system tag, plus its toggle. Membership lives in the
 * mailbox's `TagIndex` rather than the message (feed messages are immutable and have no `meta.tags`),
 * so the atom scopes re-renders to this message's membership instead of the whole index.
 */
const useSystemTag = (
  message: MessageType.Message | undefined,
  mailbox: Mailbox.Mailbox | undefined,
  tagId: SystemTags.SystemTagId,
): [boolean, () => void] => {
  const db = mailbox && Obj.getDatabase(mailbox);
  const tag = useQuery(db, Filter.foreignKeys(Tag.Tag, [SystemTags.systemTagKey(tagId)]))[0];
  const tagUri = tag && Obj.getURI(tag).toString();
  const tagIndex = mailbox?.tags?.target;
  const taggedAtom = useMemo(
    () => (tagIndex && tagUri && message ? TagIndex.atom(tagIndex, message.id, tagUri) : NOT_TAGGED),
    [tagIndex, message, tagUri],
  );
  const tagged = useAtomValue(taggedAtom);
  const handleToggle = useCallback(() => {
    if (db && message && mailbox) {
      void Effect.runFork(SystemTags.toggleTag(mailbox, message, tagId).pipe(Effect.provide(Database.layer(db))));
    }
  }, [mailbox, message, tagId, db]);

  return [tagged, handleToggle];
};

type MessageStarProps = {
  message: MessageType.Message;
  mailbox: Mailbox.Mailbox;
};

/** Star toggle backed by the mailbox tag index (membership-scoped reactivity). */
const MessageStar = ({ message, mailbox }: MessageStarProps) => {
  const [starred, handleToggleStar] = useSystemTag(message, mailbox, 'starred');

  return <Row.Star starred={starred} onToggle={handleToggleStar} />;
};

MessageStar.displayName = MESSAGE_STAR_NAME;

//
// Message Details
//

const MESSAGE_DETAILS_NAME = 'ConversationStack.MessageDetails';

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

  const recipients = useMemo(
    () => parseAddressList(message.properties?.to).map(({ email }) => email),
    [message.properties?.to],
  );

  const { onOpenAttachment } = useConversationStackContext(MESSAGE_DETAILS_NAME);
  const handleOpenAttachment = useCallback(
    (index: number) => onOpenAttachment?.(message, index),
    [onOpenAttachment, message],
  );

  // `subgrid` so the card adopts the tile's columns: row icons land in the avatar column and row
  // content aligns with the sender/subject/body, rather than the card defining its own gutters.
  return (
    <Card.Root subgrid classNames='bg-transparent' border={false} data-testid='message-header'>
      <Card.Body>
        {/* TODO(burdon): List CC/BCC too (Message schema only models `sender` today). */}
        {/* Recipients, reduced to bare addresses — the display name in the raw header duplicates the
            tile's own heading, so `"NAME" <addr>` would just repeat it. */}
        {recipients.length > 0 && (
          <Card.Row>
            <Card.Block>
              {/* One recipient reads as a person, so it gets the same avatar treatment as every other
                  person row; several are a group, which an avatar would misrepresent. */}
              {recipients.length === 1 ? (
                <Avatar actor={{ email: recipients[0] }} size={5} />
              ) : (
                <Icon icon='ph--users--regular' />
              )}
            </Card.Block>
            <Card.Text classNames='text-sm text-description'>{recipients.join(', ')}</Card.Text>
          </Card.Row>
        )}

        {/* Per-relation rows — one per ECHO object the message produced (Trip, Person, …). */}
        {objects.map((object) => (
          <Row.Ref key={Obj.getURI(object).toString()} object={object} />
        ))}

        {/* Attachments row. */}
        <Row.Attachments
          attachments={message.attachments}
          onAttachmentClick={onOpenAttachment && handleOpenAttachment}
        />

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

const MESSAGE_BODY_NAME = 'ConversationStack.MessageBody';

type MessageBodyProps = {
  message: Mailbox.MessageLike;
  mailbox?: Mailbox.Mailbox;
  options: Atom.Writable<MessageOptions>;
};

/** The message body — raw email HTML (default) or the markdown/plain rendering. */
const MessageBody = ({ message, mailbox, options }: MessageBodyProps) => {
  const { viewMode, loadRemoteImages = false } = useAtomValue(options);

  const db = Obj.getDatabase(mailbox ?? message);

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

  // Unconditional: the markdown fallback below is a conditional *return*, not a conditional hook call.
  const resolveSrc = useCidResolver(message.attachments, db);

  // The HTML view needs an html block; without one (e.g. a markdown-only body) fall through to the
  // markdown renderer. The dialect is built inline — `Html` keys rebuilds on `dialect.key`, so it
  // needs no memoization.
  if (viewMode === 'html' && html) {
    return <Html html={html} loadRemoteImages={loadRemoteImages} dialect={emailDialect({ resolveSrc })} />;
  }

  return <MarkdownViewer content={markdown} markdown={viewMode !== 'plain'} loadRemoteImages={loadRemoteImages} />;
};

MessageBody.displayName = MESSAGE_BODY_NAME;

//
// Message Menu
//

const MESSAGE_MENU_NAME = 'ConversationStack.MessageMenu';

type MessageMenuProps = {
  attendableId?: string;
  actions?: MenuActions;
};

/** Per-message toolbar menu (reply/forward/delete/extract), built by the tile and rendered top-right. */
const MessageMenu = ({ attendableId, actions }: MessageMenuProps) => (
  <Menu.Root {...(actions ?? {})} attendableId={attendableId} alwaysActive>
    <Menu.Toolbar classNames='p-1 bg-transparent'>
      <Menu.Items />
    </Menu.Toolbar>
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
        const draft = db.add(DraftMessage.make(createDraftMessage({ mode, message, mailbox })));
        // Tag as 'draft' like every other draft-creation path; `useSendEmail` removes it at send time.
        if (mailbox) {
          void Effect.runFork(SystemTags.toggleTag(mailbox, draft, 'draft').pipe(Effect.provide(Database.layer(db))));
        }
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

const MESSAGE_DRAFT_NAME = 'ConversationStack.Draft';

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
  const { mailbox, runtime, sendOperations, onDelete } = useConversationStackContext(MESSAGE_DRAFT_NAME);
  const db = Obj.getDatabase(mailbox ? mailbox : message);
  const live = useQuery(db, Filter.id(message.id))[0];
  const draft = live ?? message;
  const extensions = useEmailComposerExtensions(runtime, draft);
  const onSend = useSendEmail(runtime, draft, sendOperations);

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

const CONVERSATION_STACK_TOOLBAR_NAME = 'ConversationStack.Toolbar';

export type ConversationStackToolbarProps = ThemedClassName;

const ConversationStackToolbar = composable<HTMLDivElement, ConversationStackToolbarProps>((props, forwardedRef) => {
  const { attendableId, options, onCollapseAll, onExpandAll } = useConversationStackContext(
    CONVERSATION_STACK_TOOLBAR_NAME,
  );
  const menuActions = useThreadViewActions({ options, onCollapseAll, onExpandAll });

  return (
    <Menu.Root {...menuActions} attendableId={attendableId} alwaysActive>
      <Menu.Toolbar {...composableProps(props)} ref={forwardedRef}>
        <Menu.Items />
      </Menu.Toolbar>
    </Menu.Root>
  );
});

ConversationStackToolbar.displayName = CONVERSATION_STACK_TOOLBAR_NAME;

//
// ConversationStack
//

export const ConversationStack = {
  Root: ConversationStackRoot,
  Toolbar: ConversationStackToolbar,
  Content: ConversationStackContent,
  Message: MessageTile,
  Draft: DraftTile,
};
