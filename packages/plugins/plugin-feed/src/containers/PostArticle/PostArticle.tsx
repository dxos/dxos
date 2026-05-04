//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';

import { PostContent } from '#components';
import { meta } from '#meta';
import { FeedOperation } from '#operations';
import { Subscription } from '#types';

import { ensureStarTag, fetchArticle, hasMetaTag, toggleMetaTag, useStarTag } from '../../util';

export type PostArticleProps = AppSurface.ObjectArticleProps<Subscription.Post>;

export const PostArticle = ({ role, subject }: PostArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  // Subscribe to the post so the toolbar icons (star, archive, mark-unread) re-render
  // when their underlying state changes via Obj.update.
  const [post] = useObject(subject);
  const db = Obj.getDatabase(post);
  const starTag = useStarTag(db);

  // Lazily fetch full article content the first time this Post is shown — covers
  // entry points that bypass MagazineArticle's `handleOpen` (deep-link, agent surface,
  // restored attention). LoadPostContent is idempotent (no-op if `content` already
  // populated or `link` missing), so a unique guard per Post id is enough to keep us
  // from re-firing on every render.
  const requestedContentFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    const postId = Obj.getDXN(post).toString();
    console.log('requestedContentFor', requestedContentFor.current, postId);
    if (requestedContentFor.current === postId) {
      return;
    }
    if (!post.link || post.content) {
      return;
    }
    requestedContentFor.current = postId;
    void invokePromise(FeedOperation.LoadPostContent, { post: Ref.make(subject) }).catch((err) =>
      log.catch(err, { postLink: post.link }),
    );
  }, [subject, post.link, post.content, invokePromise]);

  // Reactive lookup of the source feed name. `post.feed?.target?.name` only renders
  // synchronously when the ref is already resolved; querying feeds via useQuery means
  // the meta line updates as soon as the feed object is loaded into the space.
  const allFeeds = useQuery(db, Filter.type(Subscription.Feed));
  const feedName = useMemo(() => {
    const dxn = post.feed?.dxn.toString();
    if (!dxn) {
      return undefined;
    }
    return allFeeds.find((feed) => Obj.getDXN(feed).toString() === dxn)?.name;
  }, [post.feed, allFeeds]);

  const archived = Boolean(post.archived);
  const starred = hasMetaTag(subject, starTag);

  const handleOpenOriginal = useCallback(() => {
    if (post.link) {
      window.open(post.link, '_blank', 'noopener,noreferrer');
    }
  }, [post.link]);

  const handleMarkUnread = useCallback(() => {
    Obj.update(subject, (subject) => {
      const mutable = subject as Obj.Mutable<typeof subject>;
      mutable.readAt = undefined;
    });
  }, [subject]);

  const handleToggleArchive = useCallback(() => {
    Obj.update(subject, (subject) => {
      const mutable = subject as Obj.Mutable<typeof subject>;
      mutable.archived = !mutable.archived;
    });
  }, [subject]);

  const handleToggleStar = useCallback(() => {
    if (!db) {
      return;
    }
    // Always go through ensureStarTag so we hit the same canonical tag — the closure
    // value of `starTag` may be stale (e.g. undefined on first click before the
    // useQuery has populated).
    const tag = ensureStarTag(db);
    toggleMetaTag(subject, tag);
  }, [db, subject]);

  // Re-fetch the article body from the source. Same path MagazineArticle uses on
  // first open, but unconditional — overwrites any existing content/imageUrl so
  // the user can recover from a stale extraction.
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    if (!post.link || refreshing) {
      return;
    }
    setRefreshing(true);
    try {
      const corsProxy = typeof window !== 'undefined' ? '/api/rss?url=' : undefined;
      const { text, imageUrls } = await fetchArticle(post.link, { corsProxy });
      Obj.update(subject, (subject) => {
        const mutable = subject as Obj.Mutable<typeof subject>;
        if (text) {
          mutable.content = text;
        }
        const hero = imageUrls[0];
        if (hero) {
          mutable.imageUrl = hero;
        }
      });
    } catch (err) {
      log.catch(err, { postLink: post.link });
    } finally {
      setRefreshing(false);
    }
  }, [subject, post.link, refreshing]);

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
          {post.readAt && (
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
