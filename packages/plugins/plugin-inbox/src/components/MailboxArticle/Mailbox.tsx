//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useMemo, useRef, useState } from 'react';

import { DxAvatar } from '@dxos/lit-ui/react';
import { Card, Focus, Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { type Message } from '@dxos/types';
import { getHashStyles } from '@dxos/ui-theme';

import { GoogleMail } from '../../functions/apis';
import { type Mailbox as MailboxType } from '../../types';
import { getMessageProps } from '../../util';

export type MailboxAction =
  | { type: 'current'; messageId: string }
  | { type: 'select'; messageId: string }
  | { type: 'select-tag'; label: string }
  | { type: 'save'; filter: string };

export type MailboxActionHandler = (action: MailboxAction) => void;

export type MailboxProps = {
  id: string;
  messages: Message.Message[];
  labels?: MailboxType.Labels;
  currentMessageId?: string;
  ignoreAttention?: boolean;
  onAction?: MailboxActionHandler;
};

type MessageTileData = {
  message: Message.Message;
  labels?: MailboxType.Labels;
  currentMessageId?: string;
  onAction?: MailboxActionHandler;
};

type MessageTileProps = Pick<MosaicTileProps<MessageTileData>, 'classNames' | 'location' | 'data'>;

const MessageTile = forwardRef<HTMLDivElement, MessageTileProps>(({ classNames, data, location }, forwardedRef) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { message, labels, currentMessageId, onAction } = data;
  const { hue, from, date, subject, snippet } = getMessageProps(message, new Date(), true);
  // TODO(wittjosiah): Show selection state in the UI.
  const _isCurrent = currentMessageId === message.id;

  // Combine forwardedRef with local ref.
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef],
  );

  const handleClick = useCallback(() => {
    rootRef.current?.focus();
    onAction?.({ type: 'current', messageId: message.id });
  }, [message.id, onAction]);

  const handleAvatarClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onAction?.({ type: 'select', messageId: message.id });
    },
    [message.id, onAction],
  );

  const handleTagClick = useCallback(
    (event: React.MouseEvent, label: string) => {
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
    <Mosaic.Tile asChild id={message.id} data={data} location={location}>
      <Focus.Group asChild>
        <Card.Root onClick={handleClick} ref={setRef}>
          <Card.Toolbar density='coarse'>
            <button
              type='button'
              // TODO(burdon): Remove custom styles.
              className='grid place-items-center opacity-70 hover:opacity-100 transition-opacity dx-focus-ring rounded'
              onClick={handleAvatarClick}
            >
              <DxAvatar hue={hue} hueVariant='surface' variant='square' size={10} fallback={from} />
            </button>
            <Card.Title classNames='flex items-center gap-2'>
              <span className='grow truncate font-medium'>{from}</span>
              <span className='text-xs text-description whitespace-nowrap shrink-0'>{date}</span>
            </Card.Title>
            <Card.Menu />
          </Card.Toolbar>
          <Card.Content>
            <Card.Row>
              <Card.Heading>{subject}</Card.Heading>
            </Card.Row>
            {snippet && (
              <Card.Row>
                <Card.Text variant='description'>{snippet}</Card.Text>
              </Card.Row>
            )}
            {messageLabels.length > 0 && (
              <Card.Row>
                <div role='none' className='flex flex-wrap gap-1 plb-1'>
                  {messageLabels.map(({ id: labelId, label, hue: labelHue }) => (
                    <button
                      key={labelId}
                      type='button'
                      className='dx-tag dx-focus-ring'
                      data-label={label}
                      data-hue={labelHue}
                      onClick={(e) => handleTagClick(e, label)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Card.Row>
            )}
          </Card.Content>
        </Card.Root>
      </Focus.Group>
    </Mosaic.Tile>
  );
});

MessageTile.displayName = 'MessageTile';

/**
 * Card-based mailbox component using mosaic layout.
 */
export const Mailbox = ({ messages, labels, currentMessageId, onAction }: MailboxProps) => {
  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  // Transform messages into tile data.
  const items = useMemo(
    () =>
      messages.map((message) => ({
        message,
        labels,
        currentMessageId,
        onAction,
      })),
    [messages, labels, currentMessageId, onAction],
  );

  // TODO(wittjosiah): This needs Selction.Group in addition to Focus.Group.
  return (
    <Focus.Group asChild>
      <Mosaic.Container asChild withFocus autoScroll={viewport}>
        <Mosaic.Viewport padding viewportRef={setViewport}>
          <Mosaic.Stack items={items} getId={(item) => item.message.id} draggable={false} Tile={MessageTile} />
        </Mosaic.Viewport>
      </Mosaic.Container>
    </Focus.Group>
  );
};

Mailbox.displayName = 'Mailbox';
