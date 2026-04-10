//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface, useLayout } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { AttentionOperation } from '@dxos/plugin-attention/operations';
import { DeckOperation } from '@dxos/plugin-deck/operations';
import { type Space } from '@dxos/react-client/echo';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { Panel, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useSelected } from '@dxos/react-ui-attention';
import { Message } from '@dxos/types';

import { MessageStack, type MessageStackActionHandler } from '#components';
import { meta } from '#meta';
import { DraftMessage, type Mailbox } from '#types';

import { getMailboxMessagePath } from '../../paths';
import { sortByCreated } from '../../util';

export type DraftsArticleProps = AppSurface.ArticleProps<unknown, { space?: Space; mailbox: Mailbox.Mailbox }>;

/**
 * Drafts list for a mailbox. Query matches the same mailbox-scoped draft messages as the former per-draft nav nodes.
 */
// TODO(wittjosiah): Reconcile implementation with MailboxArticle.
export const DraftsArticle = ({ role, space, attendableId, mailbox }: DraftsArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const layout = useLayout();
  const id = attendableId ?? Obj.getDXN(mailbox).toString();
  const currentId = useSelected(id, 'single');

  const db = space?.db ?? Obj.getDatabase(mailbox);
  const mailboxDxn = Obj.getDXN(mailbox).toString();

  const draftsFilter = useMemo(
    () =>
      Filter.type(Message.Message, {
        properties: {
          mailbox: mailboxDxn,
        },
      }),
    [mailboxDxn],
  );

  const mailboxScopedMessages = useQuery(db, draftsFilter);
  const drafts = useMemo(
    () =>
      [...mailboxScopedMessages]
        .filter((m) => DraftMessage.belongsTo(m, mailboxDxn))
        .sort(sortByCreated('created', true)),
    [mailboxDxn, mailboxScopedMessages],
  );

  const handleAction = useCallback<MessageStackActionHandler>(
    (action) => {
      switch (action.type) {
        case 'current': {
          const message = drafts.find((m) => m.id === action.messageId);
          void invokePromise(AttentionOperation.Select, {
            contextId: id,
            selection: { mode: 'single', id: message?.id },
          });

          const companion = linkedSegment('message');
          if (layout.mode === 'simple') {
            void invokePromise(LayoutOperation.UpdateComplementary, {
              subject: companion,
              state: 'expanded',
            });
          } else if (layout.mode === 'multi' && message && db) {
            void invokePromise(LayoutOperation.Open, {
              subject: [getMailboxMessagePath(db.spaceId, mailbox.id, message.id)],
              pivotId: id,
              navigation: 'immediate',
            });
          } else if (message) {
            void invokePromise(DeckOperation.ChangeCompanion, {
              companion,
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
      <Panel.Content asChild>
        {drafts.length === 0 ? (
          <div className='p-4 text-subdued'>{t('drafts.empty.message')}</div>
        ) : (
          <MessageStack
            id={id}
            messages={drafts}
            currentId={currentId}
            labels={mailbox.labels}
            onAction={handleAction}
          />
        )}
      </Panel.Content>
    </Panel.Root>
  );
};
