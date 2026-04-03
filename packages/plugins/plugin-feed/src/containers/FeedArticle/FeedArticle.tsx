//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';

import { PostStack, type PostStackAction } from '../../components';
import { Subscription } from '../../types';

export type FeedArticleProps = SurfaceComponentProps<Subscription.Feed>;

export const FeedArticle = ({ role, subject }: FeedArticleProps) => {
  const [currentPostId, setCurrentPostId] = useState<string>();
  useObject(subject);
  const feed = subject.feed?.target;
  const posts = useQuery(
    Obj.getDatabase(subject),
    feed ? Query.select(Filter.type(Subscription.Post)).from(feed) : Query.select(Filter.nothing()),
  );

  const handleAction = useCallback((action: PostStackAction) => {
    if (action.type === 'current') {
      setCurrentPostId(action.postId);
    }
  }, []);

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Content asChild>
        <PostStack id={subject.id} posts={posts} currentId={currentPostId} onAction={handleAction} />
      </Panel.Content>
    </Panel.Root>
  );
};
