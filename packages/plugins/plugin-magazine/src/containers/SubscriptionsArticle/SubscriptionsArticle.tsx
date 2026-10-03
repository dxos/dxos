//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Filter, Obj, Ref, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Attention, useSelection } from '@dxos/react-ui-attention';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { SubscriptionStack, type SubscriptionStackAction } from '#components';
import { meta } from '#meta';
import { FeedOperation, Subscription } from '#types';

export type SubscriptionsArticleProps = AppSurface.SpaceArticleProps;

export const SubscriptionsArticle = ({ role, space, attendableId }: SubscriptionsArticleProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const layout = ToolkitHooks.useLayout();

  const feeds = useQuery(space.db, Filter.type(Subscription.Subscription));
  const currentId = useSelection(attendableId, 'single');

  const handleAction = useCallback(
    (action: SubscriptionStackAction) => {
      switch (action.type) {
        case 'current': {
          invariant(attendableId);
          void invokePromise(LayoutOperation.Select, {
            contextId: attendableId,
            subject: { mode: 'single', id: action.feedId },
          });

          const companion = Attention.linkedSegment('feed');
          if (layout.mode === 'mobile') {
            void invokePromise(LayoutOperation.UpdateComplementary, {
              subject: companion,
              state: 'expanded',
            });
          } else {
            void invokePromise(LayoutOperation.UpdateCompanion, {
              subject: companion,
            });
          }
          break;
        }

        case 'sync': {
          const feedToSync = feeds.find((feed) => feed.id === action.feedId);
          if (feedToSync) {
            void invokePromise(
              FeedOperation.SyncFeed,
              { feed: Ref.make(feedToSync) },
              { spaceId: Obj.getDatabase(feedToSync)?.spaceId },
            );
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
    void invokePromise(SpaceOperation.OpenObjectForm, {
      target: space.db,
      typename: Type.getTypename(Subscription.Subscription),
    });
  }, [space, invokePromise]);

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <Toolbar.Root>
          <Button.Button label={t('add-feed.label')} icon='ph--plus--regular' iconOnly onClick={handleCreate} />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <SubscriptionStack id={attendableId} feeds={feeds} currentId={currentId} onAction={handleAction} />
      </Panel.Body>
    </Panel.Root>
  );
};

SubscriptionsArticle.displayName = 'SubscriptionsArticle';
