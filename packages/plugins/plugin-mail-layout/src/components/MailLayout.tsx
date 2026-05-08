//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { resolvePersonalSpace } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Feed, Query } from '@dxos/echo';
import { log } from '@dxos/log';
import { Node } from '@dxos/plugin-graph';
import { InboxOperation } from '@dxos/plugin-inbox/operations';
import { Mailbox } from '@dxos/plugin-inbox/types';
import { useClient } from '@dxos/react-client';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { ErrorFallback, Panel, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useSelected } from '@dxos/react-ui-attention';
import { Message } from '@dxos/types';

import { meta } from '#meta';

// Mirrors the (unexported) path helpers in plugin-inbox/src/paths.ts. The
// MailboxArticle dispatches `showItem` with these exact paths, and we read the
// same selection state via `useSelected`, so the formats must match.
const mailboxPath = (spaceId: string, mailboxId: string) => `${Node.RootId}/${spaceId}/mailboxes/${mailboxId}`;
const messagePath = (spaceId: string, mailboxId: string, messageId: string) =>
  `${mailboxPath(spaceId, mailboxId)}/${linkedSegment(messageId)}`;

const Loading = () => <div className='dx-document grid place-items-center text-description'>Loading…</div>;

const Empty = ({ message }: { message: string }) => (
  <div className='dx-document grid place-items-center text-description'>{message}</div>
);

/**
 * Minimal master/detail layout for the Composer `/mail` entry point.
 *
 * Renders the user's personal-space `Mailbox` on the left and the
 * currently-selected message on the right. Auto-creates a `Mailbox` in the
 * personal space if none exists. Selection is driven by the attention
 * manager — `MailboxArticle`'s row clicks already dispatch
 * `LayoutOperation.Select`, so reading `useSelected()` here is enough.
 */
export const MailLayout = () => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const personal = resolvePersonalSpace(client);
  const space = personal?.space;
  const db = space?.db;

  const mailboxes = useQuery(db, Filter.type(Mailbox.Mailbox));
  const mailbox = mailboxes[0];

  const { invokePromise } = useOperationInvoker();
  const creatingRef = useRef(false);
  useEffect(() => {
    if (!db || mailbox || creatingRef.current) {
      return;
    }
    creatingRef.current = true;
    void invokePromise(InboxOperation.AddMailbox, {
      object: Mailbox.make({ name: 'Inbox' }),
      target: db,
    }).catch((error) => {
      log.catch(error);
      creatingRef.current = false;
    });
  }, [db, mailbox, invokePromise]);

  const mailboxAttendableId = useMemo(
    () => (db && mailbox ? mailboxPath(db.spaceId, mailbox.id) : undefined),
    [db, mailbox],
  );
  const selectedMessageId = useSelected(mailboxAttendableId, 'single');

  const feed = mailbox?.feed?.target as Feed.Feed | undefined;
  const messages = useQuery(
    db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  ) as Message.Message[];

  const selectedMessage = useMemo(
    () => (selectedMessageId ? messages.find((message) => message.id === selectedMessageId) : undefined),
    [selectedMessageId, messages],
  );
  const messageAttendableId = useMemo(
    () => (db && mailbox && selectedMessage ? messagePath(db.spaceId, mailbox.id, selectedMessage.id) : undefined),
    [db, mailbox, selectedMessage],
  );

  if (!space) {
    return <Empty message={t('detail.placeholder')} />;
  }

  if (!mailbox || !mailboxAttendableId) {
    return <Loading />;
  }

  return (
    <div className='dx-container grid grid-cols-2 bs-dvh bg-base-surface'>
      <Panel.Root className='border-ie border-separator'>
        <Panel.Content role='article'>
          <Surface.Surface
            type={AppSurface.Article}
            data={{ subject: mailbox, attendableId: mailboxAttendableId }}
            limit={1}
            fallback={ErrorFallback}
            placeholder={<Loading />}
          />
        </Panel.Content>
      </Panel.Root>
      <Panel.Root>
        <Panel.Content role='article'>
          {selectedMessage && messageAttendableId ? (
            <Surface.Surface
              key={messageAttendableId}
              type={AppSurface.Article}
              data={{
                subject: selectedMessage,
                attendableId: messageAttendableId,
                companionTo: mailbox,
              }}
              limit={1}
              fallback={ErrorFallback}
              placeholder={<Loading />}
            />
          ) : (
            <Empty message={t('detail.placeholder')} />
          )}
        </Panel.Content>
      </Panel.Root>
    </div>
  );
};
