//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Entity, Filter, Obj, Query } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';

import { PostStack, type PostStackAction } from '#components';
import { meta } from '#meta';
import { FeedOperation } from '#operations';
import { Subscription } from '#types';

export type FeedArticleProps = AppSurface.ObjectArticleProps<Subscription.Feed>;

export const FeedArticle = ({ role, subject }: FeedArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const [currentPostId, setCurrentPostId] = useState<string>();
  const [error, setError] = useState<string>();
  useObject(subject);
  const feed = subject.feed?.target;
  const posts = useQuery(
    Obj.getDatabase(subject),
    feed ? Query.select(Filter.everything()).from(feed) : Query.select(Filter.nothing()),
  );

  const handleAction = useCallback((action: PostStackAction) => {
    if (action.type === 'current') {
      setCurrentPostId(action.postId);
    }
  }, []);

  const handleSync = useCallback(() => {
    setError(undefined);
    void invokePromise(FeedOperation.SyncFeed, { feed: subject }).catch((err) => {
      setError(String(err));
    });
  }, [subject, invokePromise]);

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>{Entity.getLabel(subject)}</Toolbar.Text>
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
        <PostStack id={subject.id} posts={posts} currentId={currentPostId} onAction={handleAction} />
      </Panel.Content>
      {error && (
        <Panel.Statusbar>
          <p className='flex p-1 items-center text-error-text'>{error}</p>
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};
