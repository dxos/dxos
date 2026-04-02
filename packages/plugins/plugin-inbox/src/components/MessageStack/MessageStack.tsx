//
// Copyright 2025 DXOS.org
//

import React, {
  type KeyboardEvent,
  type MouseEvent,
  forwardRef,
  useCallback,
  useMemo,
  useState,
} from 'react';

import { DxAvatar } from '@dxos/lit-ui/react';
import { Card, ScrollArea } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { type Message } from '@dxos/types';
import { composable, composableProps, getHashStyles } from '@dxos/ui-theme';

import { GoogleMail } from '../../apis';
import { type Mailbox as MailboxType } from '../../types';
import { getMessageProps } from '../../util';

export type MessageStackAction =
  | { type: 'current'; messageId: string }
  | { type: 'select'; messageId: string }
  | { type: 'select-tag'; label: string }
  | { type: 'save'; filter: string };

export type MessageStackActionHandler = (action: MessageStackAction) => void;

//
// MessageTile
//

type MessageTileData = {
  message: Message.Message;
  labels?: MailboxType.Labels;
  onAction?: MessageStackActionHandler;
};

type MessageTileProps = Pick<MosaicTileProps<MessageTileData>, 'location' | 'data'> & { current?: boolean };

const MessageTile = forwardRef<HTMLDivElement, MessageTileProps>(({ data, location, current }, forwardedRef) => {
  const { message, labels, onAction } = data;
  const { hue, from, date, subject, snippet } = getMessageProps(message, new Date(), true);
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
        <Card.Root ref={forwardedRef} data-message-id={message.id}>
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
// MessageStack
//

export type MessageStackProps = {
  id: string;
  messages: Message.Message[];
  currentId?: string;
  labels?: MailboxType.Labels;
  ignoreAttention?: boolean;
  onAction?: MessageStackActionHandler;
};

/**
 * Card-based message stack component using mosaic layout.
 */
export const MessageStack = composable<HTMLDivElement, MessageStackProps>(
  ({ messages, labels, currentId, onAction, ...props }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    const items = useMemo(
      () => messages.map((message) => ({ message, labels, onAction })),
      [messages, labels, onAction],
    );

    const handleCurrentChange = useCallback(
      (id: string | undefined) => {
        if (id) {
          onAction?.({ type: 'current', messageId: id });
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
        <Mosaic.Container
          asChild
          withFocus
          autoScroll={viewport}
          currentId={currentId}
          onCurrentChange={handleCurrentChange}
        >
          <ScrollArea.Root orientation='vertical' padding centered>
            <ScrollArea.Viewport ref={setViewport}>
              <Mosaic.VirtualStack
                Tile={MessageTile}
                classNames='my-2'
                gap={8}
                items={items}
                draggable={false}
                getId={(item) => item.message.id}
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
