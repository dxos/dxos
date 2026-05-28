//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { getSpace } from '@dxos/client/echo';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';

import { PostContent } from '#components';
import { meta } from '#meta';
import { FeedOperation } from '#types';
import { Subscription } from '#types';

import {
  appendPostContent,
  fetchArticle,
  getSubscriptionPostState,
  updateSubscriptionPostState,
  usePostContent,
} from '../../util';

export type PostArticleProps = AppSurface.ObjectArticleProps<Subscription.Post>;

export const PostArticle = ({ role, subject }: PostArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  // Subscribe to the post so the toolbar icons (star, archive, mark-unread) re-render
  // when their underlying state changes via Obj.update.
  const [post] = useObject(subject);
  const db = Obj.getDatabase(post);
  // Subscribe to the source Subscription — its `postState[postId]` carries
  // the mutable user state for this Post (read/archived/starred/imageUrl).
  const subscription = post.source?.target;
  useObject(subscription);
  const postId = (post as { id: string }).id;
  const userState = getSubscriptionPostState(subscription, postId);
  const fetchedText = usePostContent(subscription, postId);

  // Lazily fetch full article content the first time this Post is shown — covers
  // entry points that bypass MagazineArticle's `handleOpen` (deep-link, agent surface,
  // restored attention). LoadPostContent is idempotent (no-op if `content` already
  // populated or `link` missing), so a unique guard per Post id is enough to keep us
  // from re-firing on every render.
  const requestedContentFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    const postUri = Obj.getURI(post);
    if (requestedContentFor.current === postUri) {
      return;
    }
    if (!post.link || fetchedText) {
      return;
    }
    requestedContentFor.current = postUri;
    void invokePromise(FeedOperation.LoadPostContent, { post: Ref.make(subject) }).catch((err) =>
      log.catch(err, { postLink: post.link }),
    );
  }, [subject, post, post.link, fetchedText, invokePromise]);

  // Reactive lookup of the source feed name. `post.feed?.target?.name` only renders
  // synchronously when the ref is already resolved; querying feeds via useQuery means
  // the meta line updates as soon as the feed object is loaded into the space.
  const allFeeds = useQuery(db, Filter.type(Subscription.Subscription));
  const feedName = useMemo(() => {
    const dxn = post.source?.uri;
    if (!dxn) {
      return undefined;
    }
    return allFeeds.find((feed) => Obj.getURI(feed) === dxn)?.name;
  }, [post.source, allFeeds]);

  const archived = Boolean(userState.archived);
  const starred = Boolean(userState.starred);

  const handleOpenOriginal = useCallback(() => {
    if (post.link) {
      window.open(post.link, '_blank', 'noopener,noreferrer');
    }
  }, [post.link]);

  const handleMarkUnread = useCallback(() => {
    if (!subscription) {
      return;
    }
    updateSubscriptionPostState(subscription, postId, { readAt: undefined });
  }, [subscription, postId]);

  const handleToggleArchive = useCallback(() => {
    if (!subscription) {
      return;
    }
    const current = getSubscriptionPostState(subscription, postId);
    updateSubscriptionPostState(subscription, postId, { archived: !current.archived });
  }, [subscription, postId]);

  const handleToggleStar = useCallback(() => {
    if (!subscription) {
      return;
    }
    const current = getSubscriptionPostState(subscription, postId);
    updateSubscriptionPostState(subscription, postId, {
      starred: !current.starred,
      ...(current.starred ? { starredAt: undefined } : { starredAt: new Date().toISOString() }),
    });
  }, [subscription, postId]);

  // Re-fetch the article body from the source. Same path MagazineArticle uses on
  // first open, but unconditional — appends a fresh content entry to the
  // subscription's contentFeed so the user can recover from a stale extraction.
  // Older entries remain in the queue (feeds are append-only); the lookup in
  // `usePostContent` picks the most recent match by Post id.
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    if (!post.link || refreshing || !subscription) {
      return;
    }
    const space = getSpace(subscription);
    if (!space) {
      return;
    }

    setRefreshing(true);
    try {
      const corsProxy = typeof window !== 'undefined' ? '/api/rss?url=' : undefined;
      const { text, imageUrls } = await fetchArticle(post.link, { corsProxy });
      if (text) {
        await appendPostContent(space, subscription, { postId, text });
      }
      const hero = imageUrls[0];
      if (hero) {
        updateSubscriptionPostState(subscription, postId, { imageUrl: hero });
      }
    } catch (err) {
      log.catch(err, { postLink: post.link });
    } finally {
      setRefreshing(false);
    }
  }, [subscription, postId, post.link, refreshing]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.IconButton
            label={t(starred ? 'unstar-post.label' : 'star-post.label')}
            icon={starred ? 'ph--star--fill' : 'ph--star--regular'}
            iconOnly
            onClick={handleToggleStar}
          />
          <Toolbar.IconButton
            label={t(archived ? 'unarchive-post.label' : 'archive-post.label')}
            icon={archived ? 'ph--archive--fill' : 'ph--archive--regular'}
            iconOnly
            onClick={handleToggleArchive}
          />
          {userState.readAt && (
            <Toolbar.IconButton
              label={t('mark-unread.label')}
              icon='ph--envelope--regular'
              iconOnly
              onClick={handleMarkUnread}
            />
          )}
          <Toolbar.Separator />
          {post.link && (
            <Toolbar.IconButton
              label={t(refreshing ? 'refresh-content-pending.label' : 'refresh-content.label')}
              icon='ph--arrows-clockwise--regular'
              iconOnly
              disabled={refreshing}
              onClick={() => void handleRefresh()}
            />
          )}
          {post.link && (
            <Toolbar.IconButton
              label={t('open-original.label')}
              icon='ph--arrow-square-out--regular'
              iconOnly
              onClick={handleOpenOriginal}
            />
          )}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <PostContent post={subject} metadata={feedName ? [feedName] : undefined} />
      </Panel.Content>
    </Panel.Root>
  );
};
