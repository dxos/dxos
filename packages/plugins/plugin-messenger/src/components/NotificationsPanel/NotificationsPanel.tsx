//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useCallback, useMemo, useState } from 'react';

import { Database, Filter, Obj, Query } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { Flex, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { type Message, SpaceInvitationMessage } from '@dxos/types';

import { meta } from '#meta';
import { Notifications } from '#types';

import {
  type InvitationRenderer,
  type NotificationActionHandler,
  NotificationTile,
  type NotificationTileData,
} from '../NotificationTile/index.ts';

export const NOTIFICATION_FILTERS = ['all', 'unread', 'invitations'] as const;

export type NotificationFilter = (typeof NOTIFICATION_FILTERS)[number];

const FILTER_ICONS: Record<NotificationFilter, string> = {
  all: 'ph--tray--regular',
  unread: 'ph--envelope-simple--regular',
  invitations: 'ph--users-three--regular',
};

const matchesFilter = (filter: NotificationFilter, message: Message.Message, read: ReadonlySet<string>): boolean => {
  switch (filter) {
    case 'unread':
      return !read.has(message.id);
    case 'invitations':
      return Option.isSome(SpaceInvitationMessage.match(message));
    default:
      return true;
  }
};

export type NotificationsPanelProps = {
  role?: string;
  attendableId?: string;
  /** The container whose feed is listed; its read state is updated in place. */
  notifications: Notifications.Notifications;
  renderInvitation?: InvitationRenderer;
  /** Goes to what a message links to; called after the message is marked read. */
  onOpen?: (message: Message.Message) => void;
};

/**
 * The notifications list: a filter toolbar over a stack of {@link NotificationTile}s, newest first.
 */
export const NotificationsPanel = ({
  role,
  attendableId,
  notifications,
  renderInvitation,
  onOpen,
}: NotificationsPanelProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const [readIds] = useObject(notifications, 'readIds');
  const feed = useResolveRef(notifications.feed);
  const messages = useQuery(
    Obj.getDatabase(notifications),
    feed ? Notifications.messagesQuery(feed) : Query.select(Filter.nothing()),
  );

  const read = useMemo(() => new Set(readIds), [readIds]);
  const unreadIds = useMemo(
    () => messages.filter((message) => !read.has(message.id)).map((message) => message.id),
    [messages, read],
  );

  const handleAction = useCallback<NotificationActionHandler>(
    (action) => {
      const message = messages.find((message) => message.id === action.messageId);
      if (!message) {
        return;
      }

      switch (action.type) {
        case 'open': {
          Notifications.markRead(notifications, [message.id]);
          onOpen?.(message);
          break;
        }
        case 'mark-read': {
          Notifications.markRead(notifications, [message.id]);
          break;
        }
        case 'mark-unread': {
          Notifications.markUnread(notifications, message.id);
          break;
        }
        case 'delete': {
          const db = Obj.getDatabase(notifications);
          if (db) {
            void EffectEx.runPromise(
              Notifications.remove(notifications, [message]).pipe(Effect.provide(Database.layer(db))),
            ).catch((error) => log.warn('failed to delete notification', { error }));
          }
          break;
        }
      }
    },
    [messages, notifications, onOpen],
  );

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['notifications-toolbar.menu', { ns: meta.profile.key }] })
        .subgraph((builder) =>
          builder.group(
            'filter',
            {
              label: ['notifications-filter.menu', { ns: meta.profile.key }],
              iconOnly: true,
              variant: 'toggleGroup',
              selectCardinality: 'single',
              value: filter,
            },
            (group) => {
              for (const key of NOTIFICATION_FILTERS) {
                group.action(
                  key,
                  {
                    label: [`filter-${key}.label`, { ns: meta.profile.key }],
                    icon: FILTER_ICONS[key],
                    checked: filter === key,
                  },
                  () => setFilter(key),
                );
              }
            },
          ),
        )
        .separator()
        .action(
          'mark-all-read',
          {
            label: ['mark-all-read.label', { ns: meta.profile.key }],
            icon: 'ph--checks--regular',
            disabled: unreadIds.length === 0,
          },
          () => Notifications.markRead(notifications, unreadIds),
        )
        .build(),
    [filter, notifications, unreadIds],
  );

  const items = useMemo(
    () =>
      messages
        .filter((message) => matchesFilter(filter, message, read))
        .toSorted((a, b) => b.created.localeCompare(a.created))
        .map((message): NotificationTileData => ({
          message,
          read: read.has(message.id),
          renderInvitation,
          onAction: handleAction,
        })),
    [messages, filter, read, renderInvitation, handleAction],
  );

  const getItemId = useCallback((item: NotificationTileData) => item.message.id, []);

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Panel.Header>
      <Panel.Body asChild>
        {items.length === 0 ? (
          <Flex center classNames='h-full text-fg-subtle' role='status'>
            {t(filter === 'all' ? 'empty.message' : 'empty-filtered.message')}
          </Flex>
        ) : (
          <Mosaic.Container asChild withFocus>
            <ScrollArea.Root>
              <ScrollArea.Viewport ref={setViewport}>
                <Mosaic.VirtualStack
                  Tile={NotificationTile}
                  items={items}
                  draggable={false}
                  getId={getItemId}
                  getScrollElement={() => viewport}
                  estimateSize={() => 120}
                  gap={4}
                />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Mosaic.Container>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

NotificationsPanel.displayName = 'NotificationsPanel';
