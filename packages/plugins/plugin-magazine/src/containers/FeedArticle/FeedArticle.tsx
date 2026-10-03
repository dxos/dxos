//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { Filter, Obj, Query, Ref, Scope } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { Panel } from '@dxos/react-ui';
import { ProgressMeter } from '@dxos/react-ui-components';

import { PostStack, type PostStackAction } from '#components';
import { meta } from '#meta';
import { FeedOperation, Subscription } from '#types';

import { FeedToolbar } from './FeedToolbar.tsx';

export type FeedArticleProps = AppSurface.ObjectArticleProps<Subscription.Subscription>;

export const FeedArticle = ({ role, subject, attendableId }: FeedArticleProps) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const [currentPostId, setCurrentPostId] = useState<string>();
  const [subscription] = useObject(subject);
  const syncProgress = ToolkitHooks.useProgressMonitor(FeedOperation.createSyncProgressKey(subject));
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
    <Panel.Root role={role}>
      <Panel.Header>
        <FeedToolbar attendableId={attendableId} onSync={handleSync} />
      </Panel.Header>
      <Panel.Body asChild>
        <PostStack
          id={subscription?.id ?? subject.id}
          posts={posts}
          currentId={currentPostId}
          onAction={handleAction}
        />
      </Panel.Body>
      <Panel.Footer classNames='border-t border-separator-subtle'>
        <ProgressMeter state={syncProgress} />
      </Panel.Footer>
    </Panel.Root>
  );
};

FeedArticle.displayName = 'FeedArticle';
