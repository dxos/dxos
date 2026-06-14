//
// Copyright 2025 DXOS.org
//

import React, {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  forwardRef,
  useCallback,
  useMemo,
  useState,
} from 'react';

import { DxAvatar } from '@dxos/lit-ui/react';
import { Card, ScrollArea } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { type Message } from '@dxos/types';
import { getHashStyles } from '@dxos/ui-theme';

import { GoogleMail } from '../../apis';
import { getMessageProps } from '../../util';
import { Header } from '../Header';

export type MessageStackAction =
  | { type: 'current'; messageId: string }
  | { type: 'current-thread'; threadId: string; messageId: string }
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
   * When true, messages are grouped by `threadId` and only the most recent message
   * in each thread is displayed. Messages without a threadId form singleton threads.
   */
  threads?: boolean;
  onAction?: MessageStackActionHandler;
};

/**
 * Card-based message stack component using mosaic layout.
 */
export const MessageStack = composable<HTMLDivElement, MessageStackProps>(
  ({ messages, tags, currentId, selectedIds, starredIds, threads, onAction, ...props }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);

    const threadGroups = useMemo(() => {
      if (!threads) {
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
    }, [messages, threads]);

    const items = useMemo(() => {
      if (threadGroups) {
        return Array.from(threadGroups.entries(), ([threadId, threadMessages]) => ({
          threadId,
          messages: threadMessages,
          tags,
          // Threads show the latest message; star reflects/toggles that message.
          starred: starredIds?.has(threadMessages[0]?.id),
          onAction,
        }));
      }

      return messages?.map((message) => ({
        message,
        tags: tags?.[message.id],
        starred: starredIds?.has(message.id),
        onAction,
      }));
    }, [threadGroups, messages, tags, starredIds, onAction]);

    // In threaded view, the incoming `currentId` is a message ID (set when a
    // specific message becomes selected), but the tiles are keyed by thread ID.
    // Map the message ID up to its enclosing thread so the tile actually lights
    // up. Without this, `aria-current` is never set on a thread tile and
    // `dx-current`'s background never appears (especially visible when the
    // Card has `border={false}` and no default surface).
    const effectiveCurrentId = useMemo(() => {
      if (!threadGroups || !currentId) {
        return currentId;
      }
      for (const [threadId, threadMessages] of threadGroups) {
        if (threadId === currentId || threadMessages.some((message) => message.id === currentId)) {
          return threadId;
        }
      }
      return currentId;
    }, [threadGroups, currentId]);

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
          selectedIds={selectedIds}
          onSelectionChange={handleSelectionChange}
        >
          <ScrollArea.Root padding centered thin>
            <ScrollArea.Viewport ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={threads ? (ThreadTile as any) : MessageTile}
                items={items as any}
                draggable={false}
                getId={(item: any) => item.threadId ?? item.message?.id}
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

const TILE_CLASSNAMES = 'dx-hover dx-current dx-selected p-1 rounded-md border border-subdued-separator';

type MessageStackTileProps = Pick<MosaicTileProps<unknown>, 'data' | 'location' | 'current'> & {
  id: string;
  /** Header title content (rendered in a flex row). */
  title: ReactNode;
  /** Whether the tile's message is starred; the star toggle renders only when `onToggleStar` is set. */
  starred?: boolean;
  onCurrentChange: () => void;
  onToggleStar?: () => void;
  onClick?: (event: MouseEvent) => void;
  children?: ReactNode;
};

/**
 * Shared shell for message/thread tiles: `Mosaic.Tile` → `Focus.Item` → `Card.Root` with a header
 * (star · title · menu). The sender avatar lives in the body (supplied by callers as children).
 */
const MessageStackTile = forwardRef<HTMLDivElement, MessageStackTileProps>(
  ({ id, data, location, current, title, starred, onCurrentChange, onToggleStar, onClick, children }, forwardedRef) => (
    <Mosaic.Tile asChild classNames={TILE_CLASSNAMES} id={id} data={data} location={location}>
      <Focus.Item asChild current={current} onCurrentChange={onCurrentChange}>
        <Card.Root fullWidth border={false} onClick={onClick} ref={forwardedRef}>
          <Card.Header>
            <Card.Block>
              <Header.StarButton starred={starred} onToggle={onToggleStar} />
            </Card.Block>
            <Card.Title classNames='flex items-center gap-3'>{title}</Card.Title>
            <Card.Menu />
          </Card.Header>
          <Card.Body>{children}</Card.Body>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  ),
);

MessageStackTile.displayName = 'MessageStackTile';

type MessageTileData = {
  message: Message.Message;
  tags?: MessageStackTag[];
  starred?: boolean;
  onAction?: MessageStackActionHandler;
};

type MessageTileProps = Pick<MosaicTileProps<MessageTileData>, 'data' | 'location' | 'current'>;

const MessageTile = forwardRef<HTMLDivElement, MessageTileProps>(({ data, location, current }, forwardedRef) => {
  const { message, tags, starred, onAction } = data;
  const { hue, from, date, subject, snippet } = getMessageProps(message, new Date(), { compact: true });
  const { setCurrentId, setSelected } = useMosaicContainer('MessageTile');

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

  const messageLabels = useMemo(
    () =>
      (tags ?? [])
        .filter((tag) => !GoogleMail.isSystemLabel(tag.id) && tag.label)
        .map((tag) => ({ id: tag.id, hue: tag.hue ?? getHashStyles(tag.id).hue, label: tag.label })),
    [tags],
  );

  return (
    <MessageStackTile
      ref={forwardedRef}
      id={message.id}
      data={data}
      location={location}
      current={current}
      starred={starred}
      onCurrentChange={handleCurrentChange}
      onToggleStar={onAction ? handleToggleStar : undefined}
      title={
        <>
          <span className='grow truncate font-medium'>{subject}</span>
          <span className='text-xs text-description whitespace-nowrap shrink-0'>{date}</span>
        </>
      }
    >
      <Card.Row>
        <Card.Block>
          <DxAvatar
            hue={hue}
            hueVariant='surface'
            variant='circle'
            size={6}
            fallback={from}
            onClick={handleAvatarClick}
          />
        </Card.Block>
        <Card.Text>{from}</Card.Text>
      </Card.Row>

      {snippet && (
        <Card.Row>
          <Card.Text variant='description'>{snippet}</Card.Text>
        </Card.Row>
      )}

      <Header.TagsRow tags={messageLabels} onTagClick={handleTagClick} />
    </MessageStackTile>
  );
});

MessageTile.displayName = 'MessageTile';

//
// ThreadTile
//

type ThreadTileData = {
  threadId: string;
  messages: Message.Message[];
  tags?: MessageTagsIndex;
  starred?: boolean;
  onAction?: MessageStackActionHandler;
};

type ThreadTileProps = Pick<MosaicTileProps<ThreadTileData>, 'data' | 'location' | 'current'>;

const ThreadTile = forwardRef<HTMLDivElement, ThreadTileProps>(({ data, location, current }, forwardedRef) => {
  const { threadId, messages, starred, onAction } = data;
  const latest = messages[0];
  const { subject } = getMessageProps(latest, new Date());
  const { setCurrentId, setSelected } = useMosaicContainer('ThreadTile');

  // Click / Enter commit current + selection using the LATEST message's ID, not
  // the threadId. The parent's action handler resolves `messageId` against the
  // flat message list, so passing a threadId would cause an `invariant` to
  // fire. MessageStack maps the message ID back up to the enclosing thread
  // when computing `effectiveCurrentId` so the tile still lights up.
  const handleCurrentChange = useCallback(() => {
    setCurrentId(latest.id);
    setSelected(latest.id, true);
  }, [latest.id, setCurrentId, setSelected]);

  const handleThreadClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      onAction?.({ type: 'current-thread', threadId, messageId: latest.id });
    },
    [threadId, latest.id, onAction],
  );

  const handleMessageClick = useCallback(
    (event: MouseEvent, messageId: string) => {
      event.stopPropagation();
      onAction?.({ type: 'current', messageId });
    },
    [onAction],
  );

  const handleToggleStar = useCallback(() => onAction?.({ type: 'star', messageId: latest.id }), [latest.id, onAction]);

  return (
    <MessageStackTile
      ref={forwardedRef}
      id={threadId}
      data={data}
      location={location}
      current={current}
      starred={starred}
      onCurrentChange={handleCurrentChange}
      onToggleStar={onAction ? handleToggleStar : undefined}
      onClick={handleThreadClick}
      title={<span className='grow truncate font-medium'>{subject}</span>}
    >
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
    </MessageStackTile>
  );
});

ThreadTile.displayName = 'ThreadTile';
