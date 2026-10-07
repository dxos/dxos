//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Database, Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import { type InboxService } from '@dxos/protocols/rpc';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { Mosaic } from '@dxos/react-ui-mosaic';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import { type Message, SpaceInvitationMessage } from '@dxos/types';

import { meta } from '#meta';
import { Notifications } from '#types';

import {
  type InvitationRenderer,
  type NotificationActionHandler,
  NotificationTile,
  type NotificationTileData,
} from './NotificationTile.tsx';

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

const MINUTE_MS = 60_000;

/** The wall clock, refreshed every `interval`; one per panel, so tiles' relative times move together. */
const useNow = (interval: number): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return now;
};

export type NotificationsPanelProps = {
  role?: string;
  /** Makes the panel attendable, so its toolbar takes attention styling and contributed actions target it. */
  attendableId?: string;
  /** The containers whose feeds are listed, the one to write read state to first (see `Notifications.order`). */
  containers: readonly Notifications.Notifications[];
  renderInvitation?: InvitationRenderer;
  /** Goes to what a message links to; called after the message is marked read. */
  onOpen?: (message: Message.Message) => void;
  /** Explains an empty list that is empty because EDGE refuses to deliver, not because nothing arrived. */
  inboxStatus?: InboxService.Status;
};

/**
 * The notifications list: a filter toolbar over a stack of {@link NotificationTile}s, newest first.
 */
export const NotificationsPanel = ({
  role,
  attendableId,
  containers,
  renderInvitation,
  onOpen,
  inboxStatus = 'available',
}: NotificationsPanelProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const now = useNow(MINUTE_MS);
  const attentionAttributes = useAttentionAttributes(attendableId);
  const viewAtom = useMemo(() => Atom.make((get) => Notifications.deriveView(get, containers)), [containers]);
  const { messages, read } = useAtomValue(viewAtom);
  const unread = useMemo(() => messages.filter((message) => !read.has(message.id)), [messages, read]);

  const handleAction = useCallback<NotificationActionHandler>(
    (action) => {
      const message = messages.find((message) => message.id === action.messageId);
      if (!message) {
        return;
      }

      switch (action.type) {
        case 'open': {
          Notifications.markRead(containers, [message]);
          onOpen?.(message);
          break;
        }
        case 'mark-read': {
          Notifications.markRead(containers, [message]);
          break;
        }
        case 'mark-unread': {
          Notifications.markUnread(containers, [message]);
          break;
        }
        case 'delete': {
          const db = containers[0] && Obj.getDatabase(containers[0]);
          if (db) {
            void EffectEx.runPromise(
              Notifications.remove(containers, [message]).pipe(Effect.provide(Database.layer(db))),
            ).catch((error) => log.warn('failed to delete notification', { error }));
          }
          break;
        }
      }
    },
    [messages, containers, onOpen],
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
            disabled: unread.length === 0,
          },
          () => Notifications.markRead(containers, unread),
        )
        .build(),
    [filter, containers, unread],
  );

  const items = useMemo(
    () =>
      messages
        .filter((message) => matchesFilter(filter, message, read))
        .toSorted((a, b) => b.created.localeCompare(a.created))
        .map((message): NotificationTileData => ({
          message,
          read: read.has(message.id),
          now,
          renderInvitation,
          onAction: handleAction,
        })),
    [messages, filter, read, now, renderInvitation, handleAction],
  );

  const getItemId = useCallback((item: NotificationTileData) => item.message.id, []);

  return (
    <Panel.Root role={role} {...attentionAttributes}>
      <Panel.Header>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Panel.Header>
      <Panel.Body asChild>
        {items.length === 0 ? (
          <Layout.Flex center classNames='h-full text-fg-subtle' role='status'>
            {t(
              inboxStatus === 'account-required'
                ? 'account-required.message'
                : filter === 'all'
                  ? 'empty.message'
                  : 'empty-filtered.message',
            )}
          </Layout.Flex>
        ) : (
          <Mosaic.Container asChild withFocus>
            <ScrollArea.Root>
              {/* The viewport is the Body's first Layout.Container, so it takes the panel's gutter around the tiles. */}
              <ScrollArea.Viewport asChild ref={setViewport}>
                <Layout.Container padBlock>
                  <Mosaic.VirtualStack
                    Tile={NotificationTile}
                    items={items}
                    draggable={false}
                    getId={getItemId}
                    getScrollElement={() => viewport}
                    estimateSize={() => 120}
                    gap={4}
                  />
                </Layout.Container>
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Mosaic.Container>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

NotificationsPanel.displayName = 'NotificationsPanel';
