//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Query, Ref } from '@dxos/echo';
import { useQuery, useResolveRef } from '@dxos/echo-react';
import { Button, Card, Icon, Input, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { Empty } from '@dxos/react-ui-list';
import { Message } from '@dxos/types';

import { meta } from '#meta';
import { InboxOperation, Mailbox } from '#types';

export type SubscriptionsArticleProps = AppSurface.SpaceArticleProps<{
  attendableId?: string;
  mailbox: Mailbox.Mailbox;
}>;

/**
 * Bulk-mail subscriptions for a mailbox: every sender with a `List-Unsubscribe` affordance, with a
 * checkbox to select and a Remove action that adds a skip-sender filter and fires the one-click
 * unsubscribe (`UnsubscribeSender`). Already-filtered senders drop out of the list.
 */
export const SubscriptionsArticle = ({ role, space, mailbox }: SubscriptionsArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
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

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        {subscriptions.length === 0 ? (
          <Empty label={t('subscriptions.empty.message')} />
        ) : (
          <ScrollArea.Root orientation='vertical' padding thin>
            <ScrollArea.Viewport>
              <div role='toolbar' className='flex justify-end p-1'>
                <Button variant='primary' disabled={selected.size === 0} onClick={removeSelected}>
                  {t('subscriptions.remove.label', { count: selected.size })}
                </Button>
              </div>
              {subscriptions.map((sub) => (
                <Card.Root key={sub.email} fullWidth border={false} classNames='border-b border-subdued-separator'>
                  <Card.Header>
                    <Card.Block>
                      <Input.Root>
                        <Input.Checkbox
                          checked={selected.has(sub.email)}
                          onCheckedChange={() => toggle(sub.email)}
                          data-testid='subscription-checkbox'
                        />
                      </Input.Root>
                    </Card.Block>
                    <Card.Title>{sub.name ?? sub.email}</Card.Title>
                    <Card.Block end>
                      <Icon icon='ph--envelope--regular' />
                    </Card.Block>
                  </Card.Header>
                  <Card.Body>
                    <Card.Row>
                      <Card.Text variant='description'>
                        {t('subscriptions.count.label', { email: sub.email, count: sub.count })}
                      </Card.Text>
                    </Card.Row>
                  </Card.Body>
                </Card.Root>
              ))}
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

SubscriptionsArticle.displayName = 'SubscriptionsArticle';
