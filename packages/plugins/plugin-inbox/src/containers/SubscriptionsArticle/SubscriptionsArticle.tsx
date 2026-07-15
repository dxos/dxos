//
// Copyright 2026 DXOS.org
//

import React, { forwardRef, useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { useQuery, useResolveRef } from '@dxos/echo-react';
import { Card, Input, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { Empty } from '@dxos/react-ui-list';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { Message } from '@dxos/types';

import { meta } from '#meta';
import { InboxOperation, Mailbox } from '#types';

export type SubscriptionsArticleProps = AppSurface.SpaceArticleProps<{
  attendableId?: string;
  mailbox: Mailbox.Mailbox;
}>;

type SubscriptionTileData = {
  readonly subscription: Mailbox.Subscription;
  readonly selected: boolean;
  readonly onToggle: (email: string) => void;
};

/** Mosaic tile for one bulk-mail subscription: a select checkbox, the sender name, and a message count. */
const SubscriptionTile = forwardRef<HTMLDivElement, Pick<MosaicTileProps<SubscriptionTileData>, 'data' | 'location'>>(
  ({ data, location }, forwardedRef) => {
    const { subscription, selected, onToggle } = data;
    const { t } = useTranslation(meta.profile.key);
    return (
      <Mosaic.Tile
        asChild
        classNames='border-b border-subdued-separator'
        id={subscription.email}
        data={data}
        location={location}
      >
        <Card.Root fullWidth border={false} ref={forwardedRef} data-testid='subscription-card'>
          <Card.Header>
            <Card.Block>
              <Input.Root>
                <Input.Checkbox
                  checked={selected}
                  onCheckedChange={() => onToggle(subscription.email)}
                  data-testid='subscription-checkbox'
                />
              </Input.Root>
            </Card.Block>
            <Card.Title>{subscription.name ?? subscription.email}</Card.Title>
          </Card.Header>
          <Card.Body>
            <Card.Row>
              <Card.Text variant='description'>
                {t('subscriptions.count.label', { email: subscription.email, count: subscription.count })}
              </Card.Text>
            </Card.Row>
          </Card.Body>
        </Card.Root>
      </Mosaic.Tile>
    );
  },
);

SubscriptionTile.displayName = 'SubscriptionTile';

/**
 * Bulk-mail subscriptions for a mailbox: every sender with a `List-Unsubscribe` affordance, with a
 * checkbox to select and a toolbar Remove action that adds a skip-sender filter and fires the one-click
 * unsubscribe (`UnsubscribeSender`). Already-filtered senders drop out of the list.
 */
export const SubscriptionsArticle = ({ role, space, attendableId, mailbox }: SubscriptionsArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const id = String(attendableId ?? Obj.getURI(mailbox));
  const feed = useResolveRef(mailbox.feed);
  const messages = useQuery(
    space.db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  );
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const subscriptions = useMemo(
    () =>
      Mailbox.deriveSubscriptions(messages).filter(
        (sub) => !Mailbox.isFiltered(mailbox, { sender: { email: sub.email } }),
      ),
    [messages, mailbox, mailbox.messageFilters],
  );

  const toggle = useCallback((email: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  }, []);

  const removeSelected = useCallback(() => {
    const spaceId = space.db.spaceId;
    for (const sub of subscriptions) {
      if (selected.has(sub.email)) {
        void invokePromise(
          InboxOperation.UnsubscribeSender,
          { mailbox: Ref.make(mailbox), email: sub.email, unsubscribe: sub.unsubscribe },
          { spaceId },
        );
      }
    }
    setSelected(new Set());
  }, [subscriptions, selected, space.db, mailbox, invokePromise]);

  const menuActions = useSubscriptionsActions(selected.size, removeSelected);
  const items = useMemo(
    () =>
      subscriptions.map((subscription) => ({
        subscription,
        selected: selected.has(subscription.email),
        onToggle: toggle,
      })),
    [subscriptions, selected, toggle],
  );

  return (
    <Panel.Root role={role}>
      <Menu.Root {...menuActions} attendableId={id}>
        <Panel.Toolbar asChild>
          <Menu.Toolbar />
        </Panel.Toolbar>
      </Menu.Root>
      <Panel.Content asChild>
        {subscriptions.length === 0 ? (
          <Empty label={t('subscriptions.empty.message')} />
        ) : (
          <ScrollArea.Root orientation='vertical' padding thin>
            <ScrollArea.Viewport>
              <Mosaic.Container asChild>
                <Mosaic.Stack
                  Tile={SubscriptionTile}
                  items={items}
                  draggable={false}
                  getId={(item) => item.subscription.email}
                />
              </Mosaic.Container>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

SubscriptionsArticle.displayName = 'SubscriptionsArticle';

/** Toolbar menu for the subscriptions view: a single Remove action, disabled until a sender is selected. */
const useSubscriptionsActions = (selectedCount: number, onRemove: () => void) =>
  useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['subscriptions.toolbar.title', { ns: meta.profile.key }] })
        .action(
          'remove',
          {
            icon: 'ph--trash--regular',
            iconOnly: false,
            disabled: selectedCount === 0,
            label: ['subscriptions.remove.label', { ns: meta.profile.key, count: selectedCount }],
            testId: 'subscriptions-remove',
          },
          onRemove,
        )
        .build(),
    [selectedCount, onRemove],
  );
