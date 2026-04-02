//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, companionSegment } from '@dxos/app-toolkit';
import { type SurfaceComponentProps, useLayout } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { AttentionOperation } from '@dxos/plugin-attention/operations';
import { DeckOperation } from '@dxos/plugin-deck/operations';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { useQuery } from '@dxos/react-client/echo';
import { IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';

import { SubscriptionStack, type SubscriptionStackAction } from '../../components';
import { meta } from '../../meta';
import { Subscription } from '../../types';

export type SubscriptionArticleProps = SurfaceComponentProps<
  Subscription.Feed,
  {
    attendableId?: string;
  }
>;

export const SubscriptionArticle = ({ role, subject, attendableId }: SubscriptionArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const id = attendableId ?? Obj.getDXN(subject).toString();
  const db = Obj.getDatabase(subject);
  const layout = useLayout();

  const feeds = useQuery(db, Filter.type(Subscription.Feed));
  const currentId = useSelected(id, 'single');

  const handleAction = useCallback(
    (action: SubscriptionStackAction) => {
      if (action.type === 'current') {
        void invokePromise(AttentionOperation.Select, {
          contextId: id,
          selection: { mode: 'single', id: action.feedId },
        });

        const companion = companionSegment('feed');
        if (layout.mode === 'simple') {
          void invokePromise(LayoutOperation.UpdateComplementary, {
            subject: companion,
            state: 'expanded',
          });
        } else {
          void invokePromise(DeckOperation.ChangeCompanion, {
            companion,
          });
        }
      }
    },
    [id, layout.mode, invokePromise],
  );

  const handleCreate = useCallback(() => {
    if (db) {
      void invokePromise(SpaceOperation.OpenCreateObject, {
        target: db,
        typename: Subscription.Feed.typename,
      });
    }
  }, [db, invokePromise]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>{t('plugin name')}</Toolbar.Text>
          <span role='none' className='grow' />
          <IconButton label={t('add feed label')} icon='ph--plus--regular' iconOnly onClick={handleCreate} />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <SubscriptionStack id={id} feeds={feeds} currentId={currentId} onAction={handleAction} />
      </Panel.Content>
    </Panel.Root>
  );
};
