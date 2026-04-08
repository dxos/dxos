//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface, LayoutOperation, companionSegment } from '@dxos/app-toolkit';
import { useLayout } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { AttentionOperation } from '@dxos/plugin-attention/operations';
import { DeckOperation } from '@dxos/plugin-deck/operations';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { invariant } from '@dxos/invariant';

import { SubscriptionStack, type SubscriptionStackAction } from '#components';
import { meta } from '#meta';
import { FeedOperation } from '#operations';
import { Subscription } from '#types';

export type SubscriptionsArticleProps = AppSurface.SpaceProps;

export const SubscriptionsArticle = ({ role, attendableId, space }: SubscriptionsArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const layout = useLayout();

  const feeds = useQuery(space?.db, Filter.type(Subscription.Feed));
  const currentId = useSelected(attendableId, 'single');

  const handleAction = useCallback(
    (action: SubscriptionStackAction) => {
      switch (action.type) {
        case 'current': {
          invariant(attendableId);
          void invokePromise(AttentionOperation.Select, {
            contextId: attendableId,
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
          break;
        }

        case 'sync': {
          const feedToSync = feeds.find((feed) => feed.id === action.feedId);
          if (feedToSync) {
            void invokePromise(FeedOperation.SyncFeed, { feed: feedToSync });
          }
          break;
        }

        case 'delete': {
          const feedToDelete = feeds.find((feed) => feed.id === action.feedId);
          if (feedToDelete) {
            Obj.getDatabase(feedToDelete)?.remove(feedToDelete);
          }
          break;
        }
      }
    },
    [attendableId, layout.mode, feeds, invokePromise],
  );

  const handleCreate = useCallback(() => {
    if (space) {
      void invokePromise(SpaceOperation.OpenCreateObject, {
        target: space.db,
        typename: Subscription.Feed.typename,
      });
    }
  }, [space, invokePromise]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.IconButton label={t('add-feed.label')} icon='ph--plus--regular' iconOnly onClick={handleCreate} />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <SubscriptionStack id={attendableId} feeds={feeds} currentId={currentId} onAction={handleAction} />
      </Panel.Content>
    </Panel.Root>
  );
};
