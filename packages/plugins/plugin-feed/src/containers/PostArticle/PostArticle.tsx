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

import { makeSnippet, stripHtml } from '../../extraction';
import { browserCorsProxy, fetchArticle } from '../../sources';
import { appendPostContent, setReadAt, setTag, usePostContentAtom, useReadState, useTagState } from '../../state';

export type PostArticleProps = AppSurface.ObjectArticleProps<Subscription.Post>;

export const PostArticle = ({ role, subject }: PostArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  // Subscribe to the post so the toolbar icons (star, archive, mark-unread) re-render
  // when their underlying state changes via Obj.update.
  const [post] = useObject(subject);
  const db = Obj.getDatabase(post);
  const subscription = post.source?.target;
  const { id } = post;
  // Per-Post read/tag slices: re-render the toolbar only when THIS post's state changes (not when a
  // sibling post sharing the same Subscription mutates).
  const { readAt } = useReadState(subject);
  const { starred, archived } = useTagState(subject);
  const read = readAt !== undefined;
  const postContent = usePostContentAtom(subject);

  // Lazily fetch full article content the first time this Post is shown — covers
  // entry points that bypass MagazineArticle's `handleOpen` (deep-link, agent surface,
  // restored attention). LoadPostContent is idempotent (no-op if `content` already
  // populated or `link` missing), so a unique guard per Post id is enough to keep us
  // from re-firing on every render.
  const requestedContentFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (requestedContentFor.current === id) {
      return;
    }
    if (!post.link || postContent) {
      return;
    }
    requestedContentFor.current = id;
    void invokePromise(FeedOperation.LoadPostContent, { post: Ref.make(subject) }).catch((err) =>
      log.catch(err, { postLink: post.link }),
    );
  }, [subject, post, post.link, postContent, invokePromise, id]);

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

  const handleOpenOriginal = useCallback(() => {
    if (post.link) {
      window.open(post.link, '_blank', 'noopener,noreferrer');
    }
  }, [post.link]);

  const handleMarkUnread = useCallback(() => {
    if (subscription) {
      setReadAt(subscription, id, undefined);
    }
  }, [subscription, id]);

  const handleToggleArchive = useCallback(() => {
    if (db && subscription) {
      void setTag(subscription, id, db, 'archived', !archived);
    }
  }, [db, subscription, id, archived]);

  const handleToggleStar = useCallback(() => {
    if (db && subscription) {
      void setTag(subscription, id, db, 'starred', !starred);
    }
  }, [db, subscription, id, starred]);

  // Re-fetch the article body from the source. Same path MagazineArticle uses on
  // first open, but unconditional — appends a fresh content entry to the
  // subscription's contentFeed so the user can recover from a stale extraction.
  // Older entries remain in the queue (feeds are append-only); the reverse-ref
  // lookup in `usePostContent` picks the most recent match for this Post.
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
      const { text, imageUrls } = await fetchArticle(post.link, { corsProxy: browserCorsProxy() });
      if (text) {
        await appendPostContent(space, subscription, {
          post,
          text,
          snippet: makeSnippet(stripHtml(text)),
          imageUrl: imageUrls[0],
        });
      }
    } catch (err) {
      log.catch(err, { postLink: post.link });
    } finally {
      setRefreshing(false);
    }
  }, [subscription, post, post.link, refreshing]);

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
          {read && (
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
