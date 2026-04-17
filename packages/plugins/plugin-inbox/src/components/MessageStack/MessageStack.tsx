//
// Copyright 2025 DXOS.org
//

import React, { type KeyboardEvent, type MouseEvent, forwardRef, useCallback, useMemo, useState } from 'react';

import { DxAvatar } from '@dxos/lit-ui/react';
import { Card, ScrollArea } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { type Message } from '@dxos/types';
import { composable, composableProps, getHashStyles } from '@dxos/ui-theme';

import { type Mailbox as MailboxType } from '#types';

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

export type MessageStackProps = {
  id: string;
  messages?: Message.Message[];
  labels?: MailboxType.Labels;
  currentId?: string;
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
  ({ messages, labels, currentId, threads, onAction, ...props }, forwardedRef) => {
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
          labels,
          onAction,
        }));
      }

      return messages?.map((message) => ({ message, labels, onAction }));
    }, [threadGroups, messages, labels, onAction]);

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

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        (document.activeElement as HTMLElement | null)?.click();
      }
    }, []);

    return (
      <Focus.Group asChild {...composableProps(props)} onKeyDown={handleKeyDown} ref={forwardedRef}>
        <Mosaic.Container asChild withFocus currentId={currentId} onCurrentChange={handleCurrentChange}>
          <ScrollArea.Root padding centered>
            <ScrollArea.Viewport ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={threads ? (ThreadTile as any) : MessageTile}
                classNames='my-2'
                gap={8}
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
  labels?: MailboxType.Labels;
  onAction?: MessageStackActionHandler;
};

type MessageTileProps = Pick<MosaicTileProps<MessageTileData>, 'data' | 'location' | 'current'>;

const MessageTile = forwardRef<HTMLDivElement, MessageTileProps>(({ data, location, current }, forwardedRef) => {
  const { message, labels, onAction } = data;
  const { hue, from, date, subject, snippet } = getMessageProps(message, new Date(), { compact: true });
  const { setCurrentId } = useMosaicContainer('MessageTile');

  const handleCurrentChange = useCallback(() => {
    setCurrentId(message.id);
  }, [message.id, setCurrentId]);

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
    if (!labels || !Array.isArray(message.properties?.labels)) {
      return [];
    }

    return message.properties.labels
      .filter((labelId: string) => !GoogleMail.isSystemLabel(labelId))
      .map((labelId: string) => ({
        id: labelId,
        hue: getHashStyles(labelId).hue,
        label: labels[labelId],
      }))
      .filter((item) => item.label);
  }, [labels, message.properties?.labels]);

  return (
    <Mosaic.Tile asChild classNames='dx-hover dx-current dx-selected' id={message.id} data={data} location={location}>
      <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <Card.Root ref={forwardedRef} fullWidth>
          <Card.Toolbar>
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
          </Card.Toolbar>
          <Card.Content>
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
                <div role='none' className='flex flex-wrap gap-1 py-1'>
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
          </Card.Content>
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
  labels?: MailboxType.Labels;
  onAction?: MessageStackActionHandler;
};

type ThreadTileProps = Pick<MosaicTileProps<ThreadTileData>, 'data' | 'location' | 'current'>;

const ThreadTile = forwardRef<HTMLDivElement, ThreadTileProps>(({ data, location, current }, forwardedRef) => {
  const { threadId, messages, onAction } = data;
  const latest = messages[0];
  const { hue, from, subject } = getMessageProps(latest, new Date());
  const { setCurrentId } = useMosaicContainer('ThreadTile');

  const handleCurrentChange = useCallback(() => {
    setCurrentId(threadId);
  }, [threadId, setCurrentId]);

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
    <Mosaic.Tile asChild classNames='dx-hover dx-current dx-selected' id={threadId} data={data} location={location}>
      <Focus.Item asChild current={current}>
        <Card.Root ref={forwardedRef} fullWidth onClick={handleThreadClick}>
          <Card.Toolbar>
            <Card.IconBlock>
              <DxAvatar hue={hue} hueVariant='surface' variant='square' size={6} fallback={from} />
            </Card.IconBlock>
            <Card.Title classNames='flex items-center'>
              <span className='grow truncate font-medium'>{subject}</span>
            </Card.Title>
            <Card.Menu />
          </Card.Toolbar>
          <Card.Content>
            {/* TODO(burdon): Currently limits to last n messages. */}
            {messages.slice(0, 4).map((message) => {
              const { from, date, snippet } = getMessageProps(message, new Date(), { compact: true, time: true });
              return (
                <Card.Row key={message.id} icon='ph--user--regular'>
                  <div role='none' className='flex flex-col py-1'>
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
          </Card.Content>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

ThreadTile.displayName = 'ThreadTile';
