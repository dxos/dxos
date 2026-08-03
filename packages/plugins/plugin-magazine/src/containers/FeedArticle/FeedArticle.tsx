//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Ref, Scope } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { Panel } from '@dxos/react-ui';

import { PostStack, type PostStackAction } from '#components';
import { meta } from '#meta';
import { FeedOperation } from '#types';
import { Subscription } from '#types';

import { FeedToolbar } from './FeedToolbar';

export type FeedArticleProps = AppSurface.ObjectArticleProps<Subscription.Subscription>;

export const FeedArticle = ({ role, subject, attendableId }: FeedArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const [currentPostId, setCurrentPostId] = useState<string>();
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
    // Failures surface as a toast via `notify`; invokePromise resolves with `{ error }`, never throws.
    void invokePromise(
      FeedOperation.SyncFeed,
      { feed: Ref.make(subject) },
      {
        spaceId: Obj.getDatabase(subject)?.spaceId,
        notify: { error: ['sync-feed-error.title', { ns: meta.profile.key }] },
      },
    );
  }, [subject, invokePromise]);

  return (
    <Panel.Root role={role} className='dx-document'>
      <FeedToolbar attendableId={attendableId} onSync={handleSync} />
      <Panel.Content asChild>
        <PostStack
          id={subscription?.id ?? subject.id}
          posts={posts}
          currentId={currentPostId}
          onAction={handleAction}
        />
      </Panel.Content>
    </Panel.Root>
  );
};

FeedArticle.displayName = 'FeedArticle';
