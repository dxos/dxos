//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import React, { useContext, useEffect, useMemo, useState } from 'react';

import { Surface, useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSpace, Paths } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, type Feed, Query } from '@dxos/echo';
import { log } from '@dxos/log';
import { Node } from '@dxos/plugin-graph';
import { InboxOperation, Mailbox } from '@dxos/plugin-inbox/types';
import { useClient } from '@dxos/react-client';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { ErrorFallback, Panel, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useSelection } from '@dxos/react-ui-attention';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { Message } from '@dxos/types';

import { MailLayoutState } from '#capabilities';
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
  const { t } = useTranslation(meta.profile.key);
  const client = useClient();
  const personal = AppSpace.resolvePersonalSpace(client);
  const space = personal?.space;

  // Publish the personal-space path as the active workspace so plugins that
  // resolve via `useActiveSpace()` (e.g. plugin-integration's auth surface,
  // which renders the Gmail connect button in the mailbox's empty state) work.
  useWriteWorkspace(space);

  const { mailbox, ready } = useEnsureMailbox(space);
  const spaceId = space?.id;

  const mailboxAttendableId = useMemo(
    () => (spaceId && mailbox ? mailboxPath(spaceId, mailbox.id) : undefined),
    [spaceId, mailbox],
  );
  const selectedMessageId = useSelection(mailboxAttendableId, 'single');

  const feed = mailbox?.feed?.target as Feed.Feed | undefined;
  const messages = useQuery(
    space?.db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  ) as Message.Message[];

  const selectedMessage = useMemo(
    () => (selectedMessageId ? messages.find((message) => message.id === selectedMessageId) : undefined),
    [selectedMessageId, messages],
  );
  const messageAttendableId = useMemo(
    () => (spaceId && mailbox && selectedMessage ? messagePath(spaceId, mailbox.id, selectedMessage.id) : undefined),
    [spaceId, mailbox, selectedMessage],
  );

  if (!space || !ready) {
    return <Loading />;
  }

  if (!mailbox || !mailboxAttendableId) {
    return <Loading />;
  }

  return (
    <Mosaic.Root>
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
    </Mosaic.Root>
  );
};

/** Set the layout's `workspace` to the personal space's path once it resolves. */
const useWriteWorkspace = (space: Space | undefined) => {
  const registry = useContext(RegistryContext);
  const stateAtom = useCapability(MailLayoutState);
  useEffect(() => {
    if (!space) {
      return;
    }
    const next = Paths.getSpacePath(space.id);
    if (registry.get(stateAtom).workspace !== next) {
      registry.set(stateAtom, { workspace: next });
    }
  }, [space, registry, stateAtom]);
};

/**
 * Find or create a Mailbox in the personal space. Avoids the `useQuery`
 * load-race that would create a duplicate by awaiting an explicit
 * `Query.run()` before deciding to create.
 */
const useEnsureMailbox = (space: Space | undefined): { mailbox: Mailbox.Mailbox | undefined; ready: boolean } => {
  const { invokePromise } = useOperationInvoker();
  const [ready, setReady] = useState(false);
  const mailboxes = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const mailbox = mailboxes[0];

  useEffect(() => {
    if (!space) {
      setReady(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const existing = await space.db.query(Query.select(Filter.type(Mailbox.Mailbox))).run();
      if (cancelled) {
        return;
      }
      if (existing.length > 0) {
        setReady(true);
        return;
      }
      try {
        await invokePromise(InboxOperation.AddMailbox, {
          object: Mailbox.make({ name: 'Inbox' }),
          target: space.db,
        });
      } catch (error) {
        log.catch(error);
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [space, invokePromise]);

  return { mailbox, ready };
};
