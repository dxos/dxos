//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Entity, Filter, Obj, Query, Ref, Scope } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';

import { PostStack, type PostStackAction } from '#components';
import { meta } from '#meta';
import { FeedOperation } from '#types';
import { Subscription } from '#types';

export type FeedArticleProps = AppSurface.ObjectArticleProps<Subscription.Subscription>;

export const FeedArticle = ({ role, subject }: FeedArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const [currentPostId, setCurrentPostId] = useState<string>();
  const [error, setError] = useState<string>();
  const [subscription] = useObject(subject);
  // Subscribe to the backing queue via its Ref — `.target` alone does not re-render when the
  // feed loads after navigation (same pitfall as plugin-inbox MailboxArticle).
  const [postFeed] = useObject(subscription?.feed);
  const db = Obj.getDatabase(subscription);
  const posts = useQuery(
    db,
    postFeed
      ? Query.select(Filter.type(Subscription.Post)).from(Scope.feed(Obj.getURI(postFeed)))
      : Query.select(Filter.nothing()),
  );

  const handleAction = useCallback((action: PostStackAction) => {
    if (action.type === 'current') {
      setCurrentPostId(action.postId);
    }
  }, []);

  const handleSync = useCallback(() => {
    setError(undefined);
    void invokePromise(
      FeedOperation.SyncFeed,
      { feed: Ref.make(subject) },
      { spaceId: Obj.getDatabase(subject)?.spaceId },
    ).catch((err) => {
      setError(String(err));
    });
  }, [subject, invokePromise]);

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>{subscription ? Entity.getLabel(subscription) : ''}</Toolbar.Text>
          <Toolbar.Separator />
          <Toolbar.IconButton
            label={t('sync-feed.label')}
            icon='ph--arrows-clockwise--regular'
            iconOnly
            onClick={handleSync}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <PostStack
          id={subscription?.id ?? subject.id}
          posts={posts}
          currentId={currentPostId}
          onAction={handleAction}
        />
      </Panel.Content>
      {error && (
        <Panel.Statusbar>
          <p className='flex p-1 items-center text-error-text'>{error}</p>
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};
