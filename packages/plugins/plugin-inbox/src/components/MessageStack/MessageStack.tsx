//
// Copyright 2025 DXOS.org
//

import React, { type KeyboardEvent, type MouseEvent, forwardRef, useCallback, useMemo, useState } from 'react';

import { DxAvatar } from '@dxos/lit-ui/react';
import { Card, ScrollArea } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { type Message } from '@dxos/types';
import { getHashStyles } from '@dxos/ui-theme';

import { GoogleMail } from '../../apis';
import { getMessageProps } from '../../util';

export type MessageStackAction =
  | { type: 'current'; messageId: string }
  | { type: 'current-thread'; threadId: string; messageId: string }
  | { type: 'select'; messageId: string }
  | { type: 'select-tag'; label: string }
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
  ({ messages, tags, currentId, selectedIds, threads, onAction, ...props }, forwardedRef) => {
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
          onAction,
        }));
      }

      return messages?.map((message) => ({ message, tags: tags?.[message.id], onAction }));
    }, [threadGroups, messages, tags, onAction]);

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
          <ScrollArea.Root>
            <ScrollArea.Viewport ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={threads ? (ThreadTile as any) : MessageTile}
                items={items as any}
                draggable={false}
                getId={(item: any) => item.threadId ?? item.message?.id}
                getScrollElement={() => viewport}
                estimateSize={() => 150}
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
  onAction?: MessageStackActionHandler;
};

type MessageTileProps = Pick<MosaicTileProps<MessageTileData>, 'data' | 'location' | 'current'>;

const MessageTile = forwardRef<HTMLDivElement, MessageTileProps>(({ data, location, current }, forwardedRef) => {
  const { message, tags, onAction } = data;
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

  const handleTagClick = useCallback(
    (event: MouseEvent, label: string) => {
      event.stopPropagation();
      onAction?.({ type: 'select-tag', label });
    },
    [onAction],
  );

  const messageLabels = useMemo(() => {
    if (!tags || tags.length === 0) {
      return [];
    }
    return tags
      .filter((tag) => !GoogleMail.isSystemLabel(tag.id))
      .map((tag) => ({
        id: tag.id,
        // Tag's own `hue` wins; otherwise hash the id for a stable colour like before.
        hue: tag.hue ?? getHashStyles(tag.id).hue,
        label: tag.label,
      }))
      .filter((item) => item.label);
  }, [tags]);

  return (
    <Mosaic.Tile
      asChild
      classNames='dx-hover dx-current dx-selected border-b border-subdued-separator'
      id={message.id}
      data={data}
      location={location}
    >
      <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <Card.Root fullWidth border={false} ref={forwardedRef}>
          <Card.Header>
            <Card.IconBlock>
              <DxAvatar
                hue={hue}
                hueVariant='surface'
                variant='square'
                size={6}
                fallback={from}
                onClick={handleAvatarClick}
              />
            </Card.IconBlock>
            <Card.Title classNames='flex items-center gap-3'>
              <span className='grow truncate font-medium'>{subject}</span>
              <span className='text-xs text-description whitespace-nowrap shrink-0'>{date}</span>
            </Card.Title>
            <Card.Menu />
          </Card.Header>
          <Card.Body>
            <Card.Row icon='ph--user--regular'>
              <Card.Text>{from}</Card.Text>
            </Card.Row>
            {snippet && (
              <Card.Row>
                <Card.Text variant='description'>{snippet}</Card.Text>
              </Card.Row>
            )}
            {messageLabels.length > 0 && (
              <Card.Row>
                <div className='flex flex-wrap gap-1 py-1'>
                  {messageLabels.map(({ id: labelId, label, hue: labelHue }) => (
                    <button
                      key={labelId}
                      type='button'
                      className='dx-tag dx-focus-ring'
                      data-hue={labelHue}
                      data-label={label}
                      onClick={(event) => handleTagClick(event, label)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Card.Row>
            )}
          </Card.Body>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
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
  onAction?: MessageStackActionHandler;
};

type ThreadTileProps = Pick<MosaicTileProps<ThreadTileData>, 'data' | 'location' | 'current'>;

const ThreadTile = forwardRef<HTMLDivElement, ThreadTileProps>(({ data, location, current }, forwardedRef) => {
  const { threadId, messages, onAction } = data;
  const latest = messages[0];
  const { hue, from, subject } = getMessageProps(latest, new Date());
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

  return (
    <Mosaic.Tile
      asChild
      classNames='dx-hover dx-current dx-selected border-b border-subdued-separator'
      id={threadId}
      data={data}
      location={location}
    >
      <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <Card.Root fullWidth border={false} onClick={handleThreadClick} ref={forwardedRef}>
          <Card.Header>
            <Card.IconBlock>
              <DxAvatar hue={hue} hueVariant='surface' variant='square' size={6} fallback={from} />
            </Card.IconBlock>
            <Card.Title classNames='flex items-center'>
              <span className='grow truncate font-medium'>{subject}</span>
            </Card.Title>
            <Card.Menu />
          </Card.Header>
          <Card.Body>
            {/* TODO(burdon): Currently limits to last n messages. */}
            {messages.slice(0, 4).map((message) => {
              const { from, date, snippet } = getMessageProps(message, new Date(), { compact: true, time: true });
              return (
                <Card.Row key={message.id} icon='ph--user--regular'>
                  <div className='flex flex-col py-1'>
                    <button
                      type='button'
                      className='flex items-center justify-between w-full gap-2 text-start text-sm dx-hover dx-focus-ring'
                      onClick={(event) => handleMessageClick(event, message.id)}
                    >
                      {from && <span className='truncate'>{from}</span>}
                      <span className='text-xs text-info-text whitespace-nowrap shrink-0'>{date}</span>
                    </button>

                    {snippet && (
                      <button
                        type='button'
                        className='text-start text-description line-clamp-2'
                        onClick={(event) => handleMessageClick(event, message.id)}
                      >
                        {snippet}
                      </button>
                    )}
                  </div>
                </Card.Row>
              );
            })}
          </Card.Body>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

ThreadTile.displayName = 'ThreadTile';
