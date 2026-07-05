//
// Copyright 2025 DXOS.org
//

import React, {
  type KeyboardEvent,
  type MouseEvent,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { DxAvatar } from '@dxos/lit-ui/react';
import { Card, ScrollArea } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { type Message } from '@dxos/types';

import { useGmailTags } from '#hooks';

import { getMessageProps } from '../../util';
import { Row } from '../Row';
import { Tile } from '../Tile';

export type MessageStackAction =
  | { type: 'current'; messageId: string }
  | { type: 'current-conversation'; conversationId: string; messageId: string }
  | { type: 'select'; messageId: string }
  | { type: 'select-tag'; label: string }
  | { type: 'star'; messageId: string }
  | { type: 'save'; filter: string };

export type MessageStackActionHandler = (action: MessageStackAction) => void;

//
// MessageStack
//

/**
 * One entry per tag applied to a message. The shape mirrors the value side of
 * `Mailbox.tags` (label + hue) plus a stable `id` so the UI can dedupe / key chips.
 */
export type MessageStackTag = { id: string; label: string; hue?: string };

/**
 * Inverted index `messageId → tags`. Built by `Mailbox.buildMessageTagsIndex` in the parent
 * (MailboxArticle) so each tile can look up its tags by message id with no extra query.
 */
export type MessageTagsIndex = Record<string, MessageStackTag[]>;

export type MessageStackProps = {
  id: string;
  messages?: Message.Message[];
  /** Per-message tag list, indexed by message id. */
  tags?: MessageTagsIndex;
  currentId?: string;
  /** IDs of selected messages (forwarded to Mosaic so `aria-selected` fires `dx-selected`). */
  selectedIds?: ReadonlySet<string>;
  /** IDs of starred messages; drives the per-tile star toggle. */
  starredIds?: ReadonlySet<string>;
  /**
   * When true, messages are grouped into conversations by `threadId` (the email thread key) and only
   * the most recent message per conversation is displayed. Messages without a `threadId` form singleton
   * conversations.
   */
  conversations?: boolean;
  /**
   * Authoritative message count per conversation (thread id → count), from the mailbox's thread index.
   * Preferred over the loaded-window group size, which can undercount when not all thread members are
   * resident. Falls back to the group size when absent.
   */
  threadCounts?: Record<string, number>;
  onAction?: MessageStackActionHandler;
  /** Fired when the viewport scrolls near the bottom — used to page in older messages (extend the window). */
  onEndReached?: () => void;
};

/** Distance (px) from the bottom of the viewport at which `onEndReached` fires. */
const END_REACHED_THRESHOLD = 400;

/**
 * Card-based message stack component using mosaic layout.
 */
export const MessageStack = composable<HTMLDivElement, MessageStackProps>(
  (
    {
      messages,
      tags,
      currentId,
      selectedIds,
      starredIds,
      conversations,
      threadCounts,
      onAction,
      onEndReached,
      ...props
    },
    forwardedRef,
  ) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);

    // Page in older messages when the user nears the bottom of the (newest-first) stack. The window
    // bounds the loaded data; `Mosaic.VirtualStack` already virtualizes the DOM.
    useEffect(() => {
      if (!viewport || !onEndReached) {
        return;
      }
      const handleScroll = () => {
        if (viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - END_REACHED_THRESHOLD) {
          onEndReached();
        }
      };
      viewport.addEventListener('scroll', handleScroll, { passive: true });
      return () => viewport.removeEventListener('scroll', handleScroll);
    }, [viewport, onEndReached]);

    const conversationGroups = useMemo(() => {
      if (!conversations) {
        return undefined;
      }

      const groups = new Map<string, Message.Message[]>();
      for (const message of messages ?? []) {
        const key = message.threadId ?? message.id;
        const group = groups.get(key);
        if (group) {
          group.push(message);
        } else {
          groups.set(key, [message]);
        }
      }

      // Sort each group by created descending (most recent first).
      for (const group of groups.values()) {
        group.sort((a, b) => b.created.localeCompare(a.created));
      }

      return groups;
    }, [messages, conversations]);

    const items = useMemo(() => {
      if (conversationGroups) {
        return Array.from(conversationGroups.entries(), ([conversationId, conversationMessages]) => ({
          conversationId,
          messages: conversationMessages,
          tags,
          // Authoritative count from the thread index; the loaded group is only the resident members.
          count: threadCounts?.[conversationId] ?? conversationMessages.length,
          // Conversations show the latest message; star reflects/toggles that message.
          starred: starredIds?.has(conversationMessages[0]?.id),
          onAction,
        }));
      }

      return messages?.map((message) => ({
        message,
        tags: tags?.[message.id],
        starred: starredIds?.has(message.id),
        onAction,
      }));
    }, [conversationGroups, messages, tags, starredIds, threadCounts, onAction]);

    // In conversation view, the incoming `currentId` is a message ID (set when a
    // specific message becomes selected), but the tiles are keyed by conversation ID.
    // Map the message ID up to its enclosing conversation so the tile actually lights
    // up. Without this, `aria-current` is never set on a conversation tile and
    // `dx-current`'s background never appears (especially visible when the
    // Card has `border={false}` and no default surface).
    const effectiveCurrentId = useMemo(() => {
      if (!conversationGroups || !currentId) {
        return currentId;
      }
      for (const [conversationId, conversationMessages] of conversationGroups) {
        if (conversationId === currentId || conversationMessages.some((message) => message.id === currentId)) {
          return conversationId;
        }
      }
      return currentId;
    }, [conversationGroups, currentId]);

    // Tiles are keyed by conversation id in conversation mode, so map selected message ids up to their
    // enclosing conversation — otherwise controlled `aria-selected`/`dx-selected` never matches.
    const effectiveSelectedIds = useMemo(() => {
      if (!conversationGroups || !selectedIds) {
        return selectedIds;
      }
      const mapped = new Set<string>();
      for (const selectedId of selectedIds) {
        let resolved = selectedId;
        for (const [conversationId, conversationMessages] of conversationGroups) {
          if (conversationId === selectedId || conversationMessages.some((message) => message.id === selectedId)) {
            resolved = conversationId;
            break;
          }
        }
        mapped.add(resolved);
      }
      return mapped;
    }, [conversationGroups, selectedIds]);

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
              {/* The two tile components carry different data shapes (message vs conversation), which the
                  single-typed Mosaic `Tile`/`items` generics can't express — hence the casts at this boundary. */}
              <Mosaic.VirtualStack
                Tile={conversations ? (ConversationTile as any) : MessageTile}
                items={items as any}
                draggable={false}
                getId={(item: any) => item.conversationId ?? item.message?.id}
                getScrollElement={() => viewport}
                estimateSize={() => 150}
                gap={4}
              />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Mosaic.Container>
      </Focus.Group>
    );
  },
);

MessageStack.displayName = 'MessageStack';

//
// MessageTile
//

type MessageTileData = {
  message: Message.Message;
  tags?: MessageStackTag[];
  starred?: boolean;
  onAction?: MessageStackActionHandler;
};

type MessageTileProps = Pick<MosaicTileProps<MessageTileData>, 'data' | 'location' | 'current'>;

const MessageTile = forwardRef<HTMLDivElement, MessageTileProps>(({ data, location, current }, forwardedRef) => {
  const { message, tags, starred, onAction } = data;
  const { date, subject, snippet } = getMessageProps(message, new Date(), { compact: true });
  const { setCurrentId, setSelected } = useMosaicContainer('MessageTile');
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

  return (
    <Tile.Root
      ref={forwardedRef}
      id={message.id}
      data={data}
      location={location}
      current={current}
      onCurrentChange={handleCurrentChange}
    >
      <Tile.Header
        menu
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

        {snippet && (
          <Card.Row>
            <Card.Text variant='description'>{snippet}</Card.Text>
          </Card.Row>
        )}

        <Row.Tags tags={messageTags} onTagClick={handleTagClick} />
      </Card.Body>
    </Tile.Root>
  );
});

MessageTile.displayName = 'MessageTile';

//
// ConversationTile
//

type ConversationTileData = {
  conversationId: string;
  messages: Message.Message[];
  tags?: MessageTagsIndex;
  /** Total messages in the conversation (from the thread index); may exceed the rendered preview. */
  count?: number;
  starred?: boolean;
  onAction?: MessageStackActionHandler;
};

type ConversationTileProps = Pick<MosaicTileProps<ConversationTileData>, 'data' | 'location' | 'current'>;

const ConversationTile = forwardRef<HTMLDivElement, ConversationTileProps>(
  ({ data, location, current }, forwardedRef) => {
    const { conversationId, messages, count, starred, onAction } = data;
    const latest = messages[0];
    const messageCount = count ?? messages.length;
    const { subject } = getMessageProps(latest, new Date());
    const { setCurrentId, setSelected } = useMosaicContainer('ConversationTile');

    // Click / Enter commit current + selection using the LATEST message's ID, not
    // the conversationId. The parent's action handler resolves `messageId` against the
    // flat message list, so passing a conversationId would cause an `invariant` to
    // fire. MessageStack maps the message ID back up to the enclosing conversation
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
      <Tile.Root
        ref={forwardedRef}
        id={conversationId}
        data={data}
        location={location}
        current={current}
        onCurrentChange={handleCurrentChange}
        onClick={handleConversationClick}
      >
        <Tile.Header
          menu
          starred={starred}
          onToggleStar={onAction ? handleToggleStar : undefined}
          title={
            <>
              <span className='grow truncate font-medium'>{subject}</span>
              {messageCount > 1 && (
                <span className='text-xs text-description whitespace-nowrap shrink-0'>{messageCount}</span>
              )}
            </>
          }
        />
        <Card.Body>
          {/* TODO(burdon): Currently limits to last n messages. */}
          {messages.slice(0, 4).map((message) => {
            const { hue, from, date, snippet } = getMessageProps(message, new Date(), { compact: true, time: true });
            return (
              <Card.Row key={message.id}>
                <Card.Block>
                  <DxAvatar hue={hue} hueVariant='surface' variant='square' size={6} fallback={from} />
                </Card.Block>
                <div className='flex flex-col' onClick={(event) => handleMessageClick(event, message.id)}>
                  <button type='button' className='flex items-center justify-between w-full h-8 text-start text-sm'>
                    {from && <span className='truncate'>{from}</span>}
                    <span className='text-xs text-info-text whitespace-nowrap shrink-0'>{date}</span>
                  </button>

                  {snippet && (
                    <button type='button' className='text-start text-description line-clamp-2 dx-link-hover'>
                      {snippet}
                    </button>
                  )}
                </div>
              </Card.Row>
            );
          })}
        </Card.Body>
      </Tile.Root>
    );
  },
);

ConversationTile.displayName = 'ConversationTile';
