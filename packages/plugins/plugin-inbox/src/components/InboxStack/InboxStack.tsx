//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Atom from '@effect-atom/atom/Atom';
import React, { type KeyboardEvent, type MouseEvent, forwardRef, useCallback, useMemo, useState } from 'react';

import type { PaginationResult } from '@dxos/echo-react';
import { DxAvatar } from '@dxos/lit-ui/react';
import { Card, Icon, ScrollArea } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { Highlighted, buildSnippet } from '@dxos/react-ui-search';
import { type Message } from '@dxos/types';

import { useGmailTags } from '#hooks';

import { getMessageBodyText, getMessageProps } from '../../util';
import { CardTile } from '../CardTile';
import { Row } from '../Row';

export type InboxStackAction =
  | { type: 'current'; messageId: string }
  | { type: 'current-conversation'; conversationId: string; messageId: string }
  | { type: 'select'; messageId: string }
  | { type: 'select-tag'; label: string }
  | { type: 'star'; messageId: string }
  | { type: 'ignore-sender'; messageId: string }
  | { type: 'create-topic'; messageId: string }
  | { type: 'save'; filter: string };

export type InboxStackActionHandler = (action: InboxStackAction) => void;

//
// InboxStack
//

/**
 * One entry per tag applied to a message. The shape mirrors the value side of
 * `Mailbox.tags` (label + hue) plus a stable `id` so the UI can dedupe / key chips.
 */
export type InboxStackTag = { id: string; label: string; hue?: string };

/** A conversation (email thread) rendered as one stack entry. */
export type MessageGroup = {
  /** Thread id, or the message id for singleton conversations without a thread. */
  id: string;
  /** Messages in the conversation, most recent first. May be a capped preview (see {@link total}). */
  messages: Message.Message[];
  /** Full thread size when `messages` is a capped preview; drives the "+N more" affordance. */
  total?: number;
};

/** A stack entry: an individual message or a conversation group. Entries of both kinds may be mixed. */
export type InboxStackItem = Message.Message | MessageGroup;

export const isMessageGroup = (item: InboxStackItem): item is MessageGroup => 'messages' in item;

/** Per-message tag chip atom family; each tile subscribes to just its own message's tags. */
export type MessageTagsFamily = (messageId: string) => Atom.Atom<InboxStackTag[]>;

/** Per-message starred atom family; each tile subscribes to just its own star state. */
export type StarredFamily = (messageId: string) => Atom.Atom<boolean>;

const EMPTY_TAGS_ATOM = Atom.make((): InboxStackTag[] => []);
const NOT_STARRED_ATOM = Atom.make(() => false);

export type InboxStackProps = {
  id: string;
  /** Stack entries in display order: individual messages, conversation groups, or a mix. */
  items?: InboxStackItem[];
  /** Per-message tag chip atom family; each tile subscribes to only its own message's tags. */
  tagsAtom?: MessageTagsFamily;
  currentId?: string;
  /** IDs of selected messages (forwarded to Mosaic so `aria-selected` fires `dx-selected`). */
  selectedIds?: ReadonlySet<string>;
  /** Per-message starred atom family; each tile subscribes to only its own star state. */
  starredAtom?: StarredFamily;
  /**
   * When `messages` is a lazily-loaded window (see `usePagination`), drives loading more
   * older messages as the user scrolls toward the loaded end. Accepts `usePagination`'s full
   * result directly (its `items` field is unused here) so callers can pass it through without
   * destructuring and re-bundling it themselves, which would defeat its referential stability.
   */
  pagination?: PaginationResult<unknown>;
  /** Renders a spinner after the last item while a page loads (at the top when the list is empty). */
  loading?: boolean;
  /**
   * Show the "Ignore sender" tile menu item. Off by default — only the mailbox view handles the
   * `ignore-sender` action, so other consumers (e.g. drafts) must not render a no-op menu item.
   */
  enableIgnoreSender?: boolean;
  /** Show the "Create Topic" tile menu item. Off by default (only the mailbox handles `create-topic`). */
  enableCreateTopic?: boolean;
  /** Active mailbox search term; when set, tiles render a highlighted best-match snippet instead of the default preview. */
  searchQuery?: string;
  onAction?: InboxStackActionHandler;
};

/**
 * Card-based message stack component using mosaic layout.
 */
export const InboxStack = composable<HTMLDivElement, InboxStackProps>(
  (
    {
      items,
      tagsAtom,
      currentId,
      selectedIds,
      starredAtom,
      pagination,
      loading,
      enableIgnoreSender,
      enableCreateTopic,
      searchQuery,
      onAction,
      ...props
    },
    forwardedRef,
  ) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);

    const tileItems = useMemo(
      () =>
        items?.map(
          (item): StackTileData =>
            isMessageGroup(item)
              ? {
                  conversationId: item.id,
                  messages: item.messages,
                  total: item.total,
                  // Conversations show the latest message; star reflects/toggles that message.
                  starredAtom: starredAtom?.(item.messages[0]?.id),
                  enableIgnoreSender,
                  enableCreateTopic,
                  searchQuery,
                  onAction,
                }
              : {
                  message: item,
                  tagsAtom: tagsAtom?.(item.id),
                  starredAtom: starredAtom?.(item.id),
                  enableIgnoreSender,
                  enableCreateTopic,
                  searchQuery,
                  onAction,
                },
        ),
      [items, tagsAtom, starredAtom, enableIgnoreSender, enableCreateTopic, searchQuery, onAction],
    );

    // The incoming `currentId` is a message ID (set when a specific message becomes selected),
    // but conversation tiles are keyed by conversation ID. Map the message ID up to its enclosing
    // conversation so the tile actually lights up. Without this, `aria-current` is never set on a
    // conversation tile and `dx-current`'s background never appears (especially visible when the
    // Card has `border={false}` and no default surface).
    const resolveTileId = useCallback(
      (id: string) => {
        for (const item of items ?? []) {
          if (isMessageGroup(item) && (item.id === id || item.messages.some((message) => message.id === id))) {
            return item.id;
          }
        }
        return id;
      },
      [items],
    );

    const effectiveCurrentId = useMemo(
      () => (currentId ? resolveTileId(currentId) : currentId),
      [resolveTileId, currentId],
    );

    // Conversation tiles are keyed by conversation id, so map selected message ids up to their
    // enclosing conversation — otherwise controlled `aria-selected`/`dx-selected` never matches.
    const effectiveSelectedIds = useMemo(
      () => (selectedIds ? new Set(Array.from(selectedIds, resolveTileId)) : selectedIds),
      [resolveTileId, selectedIds],
    );

    const handleCurrentChange = useCallback(
      (id: string | undefined) => {
        if (id) {
          onAction?.({
            type: 'current',
            messageId: id,
          });
        }
      },
      [onAction],
    );

    const handleSelectionChange = useCallback(
      (id: string, _selected: boolean) => {
        onAction?.({ type: 'select', messageId: id });
      },
      [onAction],
    );

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        (document.activeElement as HTMLElement | null)?.click();
      }
    }, []);

    const getItemId = useCallback(
      (item: StackTileData) => ('conversationId' in item ? item.conversationId : item.message.id),
      [],
    );

    return (
      <Focus.Group asChild {...composableProps(props)} onKeyDown={handleKeyDown} ref={forwardedRef}>
        <Mosaic.Container
          asChild
          withFocus
          currentId={effectiveCurrentId}
          onCurrentChange={handleCurrentChange}
          selectedIds={effectiveSelectedIds}
          onSelectionChange={handleSelectionChange}
        >
          <ScrollArea.Root padding centered thin>
            <ScrollArea.Viewport ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={StackTile}
                items={tileItems}
                draggable={false}
                getId={getItemId}
                getScrollElement={() => viewport}
                estimateSize={() => 150}
                gap={4}
                pagination={pagination}
              />
              {loading && (
                <div role='status' className='grid place-items-center pli-2 plb-3'>
                  <Icon
                    icon='ph--spinner-gap--regular'
                    size={5}
                    classNames='text-subdued [animation:spin_1s_linear_infinite]'
                  />
                </div>
              )}
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Mosaic.Container>
      </Focus.Group>
    );
  },
);

InboxStack.displayName = 'InboxStack';

//
// StackTile
//

type StackTileData = MessageTileData | ConversationTileData;

type StackTileProps = Pick<MosaicTileProps<StackTileData>, 'data' | 'location' | 'current'>;

/** Dispatches on the entry kind: message entries render a message tile, groups a conversation tile. */
const StackTile = forwardRef<HTMLDivElement, StackTileProps>(({ data, location, current }, forwardedRef) =>
  'message' in data ? (
    <MessageTile ref={forwardedRef} data={data} location={location} current={current} />
  ) : (
    <ConversationTile ref={forwardedRef} data={data} location={location} current={current} />
  ),
);

StackTile.displayName = 'StackTile';

//
// MessageTile
//

type MessageTileData = {
  message: Message.Message;
  tagsAtom?: Atom.Atom<InboxStackTag[]>;
  starredAtom?: Atom.Atom<boolean>;
  enableIgnoreSender?: boolean;
  enableCreateTopic?: boolean;
  /** Active mailbox search term; when set, the tile renders a highlighted best-match snippet. */
  searchQuery?: string;
  onAction?: InboxStackActionHandler;
};

type MessageTileProps = Pick<MosaicTileProps<MessageTileData>, 'data' | 'location' | 'current'>;

const MessageTile = forwardRef<HTMLDivElement, MessageTileProps>(({ data, location, current }, forwardedRef) => {
  const { message, tagsAtom, starredAtom, enableIgnoreSender, enableCreateTopic, searchQuery, onAction } = data;
  const { date, subject, snippet } = getMessageProps(message, new Date(), { compact: true });
  const { setCurrentId, setSelected } = useMosaicContainer('MessageTile');
  const tags = useAtomValue(tagsAtom ?? EMPTY_TAGS_ATOM);
  const starred = useAtomValue(starredAtom ?? NOT_STARRED_ATOM);
  const messageTags = useGmailTags(tags);

  // Click / Enter commit both current and selection. Arrow keys only move
  // focus (Focus.Item's onCurrentChange fires on click/Enter, not on focus
  // change), so they don't select.
  const handleCurrentChange = useCallback(() => {
    setCurrentId(message.id);
    setSelected(message.id, true);
  }, [message.id, setCurrentId, setSelected]);

  const handleAvatarClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      onAction?.({ type: 'select', messageId: message.id });
    },
    [message.id, onAction],
  );

  const handleToggleStar = useCallback(
    () => onAction?.({ type: 'star', messageId: message.id }),
    [message.id, onAction],
  );

  const handleTagClick = useCallback((label: string) => onAction?.({ type: 'select-tag', label }), [onAction]);

  const searchSnippet = useMemo(
    () => (searchQuery && message.blocks?.length ? buildSnippet(getMessageBodyText(message), searchQuery) : undefined),
    [message, searchQuery],
  );

  const menuItems = useMemo(() => {
    if (!onAction) {
      return undefined;
    }
    const items = [];
    if (enableIgnoreSender && message.sender?.email) {
      items.push({
        label: 'Ignore sender',
        icon: 'ph--prohibit--regular',
        onClick: () => onAction({ type: 'ignore-sender', messageId: message.id }),
      });
    }
    if (enableCreateTopic) {
      items.push({
        label: 'Create Topic',
        icon: 'ph--stack--regular',
        onClick: () => onAction({ type: 'create-topic', messageId: message.id }),
      });
    }
    return items.length > 0 ? items : undefined;
  }, [enableIgnoreSender, enableCreateTopic, onAction, message.sender?.email, message.id]);

  return (
    <CardTile.Root
      ref={forwardedRef}
      id={message.id}
      data={data}
      location={location}
      current={current}
      onCurrentChange={handleCurrentChange}
    >
      <CardTile.Header
        menu
        menuItems={menuItems}
        starred={starred}
        onToggleStar={onAction ? handleToggleStar : undefined}
        title={
          <>
            <span className='grow truncate font-medium'>{subject}</span>
            <span className='text-xs text-description whitespace-nowrap shrink-0'>{date}</span>
          </>
        }
      />
      <Card.Body>
        <Row.Person actor={message.sender} avatar role='from' onClick={handleAvatarClick} />

        {/* A message with body text always has a truthy `snippet` (`properties.snippet ?? first text block`), so gating the search snippet on `snippet` is safe. */}
        {snippet && (
          <Card.Row>
            <Card.Text variant='description'>
              {searchQuery && searchSnippet ? <Highlighted text={searchSnippet} query={searchQuery} /> : snippet}
            </Card.Text>
          </Card.Row>
        )}

        <Row.Tags tags={messageTags} onTagClick={handleTagClick} />
      </Card.Body>
    </CardTile.Root>
  );
});

MessageTile.displayName = 'MessageTile';

//
// ConversationTile
//

type ConversationTileData = {
  conversationId: string;
  messages: Message.Message[];
  /** Full thread size when `messages` is a capped preview; drives the "+N more" affordance. */
  total?: number;
  starredAtom?: Atom.Atom<boolean>;
  enableIgnoreSender?: boolean;
  enableCreateTopic?: boolean;
  /** Active mailbox search term; when set, each message's snippet renders a highlighted best-match. */
  searchQuery?: string;
  onAction?: InboxStackActionHandler;
};

type ConversationTileProps = Pick<MosaicTileProps<ConversationTileData>, 'data' | 'location' | 'current'>;

const ConversationTile = forwardRef<HTMLDivElement, ConversationTileProps>(
  ({ data, location, current }, forwardedRef) => {
    const {
      conversationId,
      messages,
      total,
      starredAtom,
      enableIgnoreSender,
      enableCreateTopic,
      searchQuery,
      onAction,
    } = data;
    const latest = messages[0];
    // `messages` is already the capped preview; `total` (when larger) is the full thread size.
    const remaining = total !== undefined ? total - messages.length : 0;
    const starred = useAtomValue(starredAtom ?? NOT_STARRED_ATOM);
    const { subject } = getMessageProps(latest, new Date());
    const { setCurrentId, setSelected } = useMosaicContainer('ConversationTile');

    // Click / Enter commit current + selection using the LATEST message's ID, not
    // the conversationId. The parent's action handler resolves `messageId` against the
    // flat message list, so passing a conversationId would cause an `invariant` to
    // fire. InboxStack maps the message ID back up to the enclosing conversation
    // when computing `effectiveCurrentId` so the tile still lights up.
    const handleCurrentChange = useCallback(() => {
      setCurrentId(latest.id);
      setSelected(latest.id, true);
    }, [latest.id, setCurrentId, setSelected]);

    const handleConversationClick = useCallback(
      (event: MouseEvent) => {
        event.stopPropagation();
        onAction?.({ type: 'current-conversation', conversationId, messageId: latest.id });
      },
      [conversationId, latest.id, onAction],
    );

    const handleMessageClick = useCallback(
      (event: MouseEvent, messageId: string) => {
        event.stopPropagation();
        onAction?.({ type: 'current', messageId });
      },
      [onAction],
    );

    const handleToggleStar = useCallback(
      () => onAction?.({ type: 'star', messageId: latest.id }),
      [latest.id, onAction],
    );

    return (
      <CardTile.Root
        ref={forwardedRef}
        id={conversationId}
        data={data}
        location={location}
        current={current}
        onCurrentChange={handleCurrentChange}
        onClick={handleConversationClick}
      >
        <CardTile.Header
          menu
          menuItems={
            onAction
              ? [
                  ...(enableIgnoreSender && latest.sender?.email
                    ? [
                        {
                          label: 'Ignore sender',
                          icon: 'ph--prohibit--regular',
                          onClick: () => onAction({ type: 'ignore-sender', messageId: latest.id }),
                        },
                      ]
                    : []),
                  ...(enableCreateTopic
                    ? [
                        {
                          label: 'Create Topic',
                          icon: 'ph--stack--regular',
                          onClick: () => onAction({ type: 'create-topic', messageId: latest.id }),
                        },
                      ]
                    : []),
                ]
              : undefined
          }
          starred={starred}
          onToggleStar={onAction ? handleToggleStar : undefined}
          title={<span className='grow truncate font-medium'>{subject}</span>}
        />
        <Card.Body>
          {messages.map((message) => (
            <ConversationMessageRow
              key={message.id}
              message={message}
              searchQuery={searchQuery}
              onMessageClick={handleMessageClick}
            />
          ))}
          {remaining > 0 && (
            <Card.Row>
              <Card.Text variant='description'>{`+${remaining} more`}</Card.Text>
            </Card.Row>
          )}
        </Card.Body>
      </CardTile.Root>
    );
  },
);

ConversationTile.displayName = 'ConversationTile';

//
// ConversationMessageRow
//

type ConversationMessageRowProps = {
  message: Message.Message;
  /** Active mailbox search term; when set, renders a highlighted best-match snippet. */
  searchQuery?: string;
  onMessageClick: (event: MouseEvent, messageId: string) => void;
};

/**
 * One message row within a {@link ConversationTile}. Extracted so the search snippet can be
 * memoized per message via `useMemo` — inlining it in the `messages.map` would recompute the
 * snippet on every keystroke for every message in the conversation.
 */
const ConversationMessageRow = ({ message, searchQuery, onMessageClick }: ConversationMessageRowProps) => {
  const { hue, from, date, snippet } = getMessageProps(message, new Date(), { compact: true, time: true });
  const searchSnippet = useMemo(
    () => (searchQuery && message.blocks?.length ? buildSnippet(getMessageBodyText(message), searchQuery) : undefined),
    [message, searchQuery],
  );

  return (
    <Card.Row>
      <Card.Block>
        <DxAvatar hue={hue} hueVariant='surface' variant='circle' size={6} fallback={from} />
      </Card.Block>
      <div className='flex flex-col' onClick={(event) => onMessageClick(event, message.id)}>
        <button type='button' className='flex items-center justify-between w-full h-8 text-start text-sm'>
          {from && <span className='truncate'>{from}</span>}
          <span className='text-xs text-info-text whitespace-nowrap shrink-0'>{date}</span>
        </button>

        {/* A message with body text always has a truthy `snippet` (`properties.snippet ?? first text block`), so gating the search snippet on `snippet` is safe. */}
        {snippet && (
          <button type='button' className='text-start text-description line-clamp-2 dx-link-hover'>
            {searchQuery && searchSnippet ? <Highlighted text={searchSnippet} query={searchQuery} /> : snippet}
          </button>
        )}
      </div>
    </Card.Row>
  );
};

ConversationMessageRow.displayName = 'ConversationMessageRow';
