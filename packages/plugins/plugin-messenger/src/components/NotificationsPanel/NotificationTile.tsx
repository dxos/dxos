//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { type ReactNode, forwardRef, useCallback, useMemo } from 'react';

import { Card, Icon, useTranslation } from '@dxos/react-ui';
import { CardTile, type CardTileMenuItem, Row } from '@dxos/react-ui-card';
import { type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { type Actor, Message, SpaceInvitationMessage } from '@dxos/types';

import { meta } from '#meta';

export type NotificationAction =
  /** Clicked: mark read and go to what the message links to. */
  | { type: 'open'; messageId: string }
  | { type: 'mark-read'; messageId: string }
  | { type: 'mark-unread'; messageId: string }
  | { type: 'delete'; messageId: string };

export type NotificationActionHandler = (action: NotificationAction) => void;

/** Renders an invitation's surface block; the slot keeps this component free of the app framework. */
export type InvitationRenderer = (props: { data: SpaceInvitationMessage.Data; sender: Actor.Actor }) => ReactNode;

export type NotificationTileData = {
  message: Message.Message;
  read: boolean;
  renderInvitation?: InvitationRenderer;
  onAction?: NotificationActionHandler;
};

export type NotificationTileProps = Pick<MosaicTileProps<NotificationTileData>, 'data' | 'location' | 'current'>;

/**
 * One notification: subject and time, then either the invitation surface or the sender, text and links.
 * Clicking it opens it; its menu toggles read state and deletes it.
 */
export const NotificationTile = forwardRef<HTMLDivElement, NotificationTileProps>(
  ({ data, location, current }, forwardedRef) => {
    const { message, read, renderInvitation, onAction } = data;
    const { t } = useTranslation(meta.profile.key);
    const { setCurrentId } = useMosaicContainer('NotificationTile');
    const invitation = useMemo(() => Option.getOrUndefined(SpaceInvitationMessage.match(message)), [message]);
    const { title, body } = useMemo(() => {
      const text = Message.extractText(message);
      const subject = message.properties?.subject;
      if (typeof subject === 'string') {
        return { title: subject, body: text };
      }
      // Without a subject the first line titles the tile, so the body starts after it.
      const [first = '', ...rest] = text.split('\n');
      return { title: first, body: rest.join('\n').trim() };
    }, [message]);
    const time = useMemo(
      () => new Date(message.created).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }),
      [message.created],
    );

    const handleCurrentChange = useCallback(() => {
      setCurrentId(message.id);
      onAction?.({ type: 'open', messageId: message.id });
    }, [message.id, setCurrentId, onAction]);

    const menuItems = useMemo<CardTileMenuItem[] | undefined>(
      () =>
        onAction && [
          read
            ? {
                label: t('mark-unread.label'),
                icon: 'ph--envelope-simple--regular',
                onClick: () => onAction({ type: 'mark-unread', messageId: message.id }),
              }
            : {
                label: t('mark-read.label'),
                icon: 'ph--envelope-simple-open--regular',
                onClick: () => onAction({ type: 'mark-read', messageId: message.id }),
              },
          {
            label: t('delete-notification.label'),
            icon: 'ph--trash--regular',
            onClick: () => onAction({ type: 'delete', messageId: message.id }),
          },
        ],
      [t, read, message.id, onAction],
    );

    return (
      <CardTile.Root
        ref={forwardedRef}
        id={message.id}
        data={data}
        location={location}
        current={current}
        onCurrentChange={handleCurrentChange}
        data-testid='messenger.notification'
      >
        <CardTile.Header
          menu={!!menuItems}
          menuItems={menuItems}
          leading={
            !read && (
              <Icon icon='ph--circle--fill' size='xs' classNames='text-accent-text' aria-label={t('unread.label')} />
            )
          }
          title={
            <>
              <span className={read ? 'grow truncate' : 'grow truncate font-medium'}>{title}</span>
              <span className='text-xs text-fg-muted whitespace-nowrap shrink-0'>{time}</span>
            </>
          }
        />
        <Card.Body>
          {invitation && renderInvitation ? (
            <Card.Row>{renderInvitation({ data: invitation, sender: message.sender })}</Card.Row>
          ) : (
            <>
              <Row.Person actor={message.sender} role='from' />
              {body && (
                <Card.Row>
                  <Card.Text variant='muted'>{body}</Card.Text>
                </Card.Row>
              )}
              <Row.Attachments attachments={message.attachments} />
            </>
          )}
        </Card.Body>
      </CardTile.Root>
    );
  },
);

NotificationTile.displayName = 'NotificationTile';
