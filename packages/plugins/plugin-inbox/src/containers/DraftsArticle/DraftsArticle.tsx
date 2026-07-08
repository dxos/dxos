//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface, useLayout } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useSelection } from '@dxos/react-ui-attention';
import { Empty } from '@dxos/react-ui-list';
import { Message } from '@dxos/types';

import { MessageStack, type MessageStackActionHandler } from '#components';
import { meta } from '#meta';
import { DraftMessage, Mailbox } from '#types';

import { getMailboxMessagePath } from '../../paths';
import { sortByCreated } from '../../util';

export type DraftsArticleProps = AppSurface.SpaceArticleProps<{
  attendableId?: string;
  mailbox: Mailbox.Mailbox;
}>;

/**
 * Drafts list for a mailbox. Query matches the same mailbox-scoped draft messages as the former per-draft nav nodes.
 */
// TODO(wittjosiah): Reconcile implementation with MailboxArticle.
export const DraftsArticle = ({ role, space, attendableId, mailbox }: DraftsArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const layout = useLayout();
  const id = attendableId ?? Obj.getURI(mailbox);
  const currentId = useSelection(id, 'single');

  const db = space.db;
  const mailboxUri = Obj.getURI(mailbox);

  const draftsFilter = useMemo(
    () =>
      Filter.type(Message.Message, {
        properties: {
          mailbox: mailboxUri,
        },
      }),
    [mailboxUri],
  );

  const mailboxScopedMessages = useQuery(db, draftsFilter);
  const drafts = useMemo(
    () =>
      [...mailboxScopedMessages]
        .filter((m) => DraftMessage.belongsTo(m, mailboxUri))
        .sort(sortByCreated('created', true)),
    [mailboxUri, mailboxScopedMessages],
  );

  const handleAction = useCallback<MessageStackActionHandler>(
    (action) => {
      switch (action.type) {
        case 'current': {
          const message = drafts.find((m) => m.id === action.messageId);
          if (!message) {
            return;
          }
          void invokePromise(LayoutOperation.Select, {
            contextId: id,
            subject: { mode: 'single', id: message.id },
          });

          const companion = linkedSegment('message');
          if (layout.mode === 'simple') {
            void invokePromise(LayoutOperation.UpdateComplementary, {
              subject: companion,
              state: 'expanded',
            });
          } else if (layout.mode === 'multi' && db) {
            void invokePromise(LayoutOperation.Open, {
              subject: [getMailboxMessagePath(db.spaceId, mailbox.id, message.id)],
              pivotId: id,
              navigation: 'immediate',
            });
          } else {
            void invokePromise(LayoutOperation.UpdateCompanion, {
              subject: companion,
            });
          }
          break;
        }

        default: {
          break;
        }
      }
    },
    [db, drafts, id, invokePromise, layout.mode, mailbox.id],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <Panel.Content asChild>
        {drafts.length === 0 ? (
          <Empty label={t('drafts.empty.message')} />
        ) : (
          <MessageStack id={id} messages={drafts} currentId={currentId} onAction={handleAction} />
        )}
      </Panel.Content>
    </Panel.Root>
  );
};
