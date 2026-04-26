//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';

import { PostContent } from '#components';
import { meta } from '#meta';
import { Subscription } from '#types';

import { ensureStarTag, fetchArticle, hasMetaTag, toggleMetaTag, useStarTag } from '../../util';

export type PostArticleProps = AppSurface.ObjectArticleProps<Subscription.Post>;

export const PostArticle = ({ role, subject: post }: PostArticleProps) => {
  const { t } = useTranslation(meta.id);
  // Subscribe to the post so the toolbar icons (star, archive, mark-unread) re-render
  // when their underlying state changes via Obj.change.
  useObject(post);
  const db = Obj.getDatabase(post);
  const starTag = useStarTag(db);

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
  const starred = hasMetaTag(post, starTag);

  const handleOpenOriginal = useCallback(() => {
    if (post.link) {
      window.open(post.link, '_blank', 'noopener,noreferrer');
    }
  }, [post.link]);

  const handleMarkUnread = useCallback(() => {
    Obj.change(post, (post) => {
      const mutable = post as Obj.Mutable<typeof post>;
      mutable.readAt = undefined;
    });
  }, [post]);

  const handleToggleArchive = useCallback(() => {
    Obj.change(post, (post) => {
      const mutable = post as Obj.Mutable<typeof post>;
      mutable.archived = !mutable.archived;
    });
  }, [post]);

  const handleToggleStar = useCallback(() => {
    if (!db) {
      return;
    }
    // Always go through ensureStarTag so we hit the same canonical tag — the closure
    // value of `starTag` may be stale (e.g. undefined on first click before the
    // useQuery has populated).
    const tag = ensureStarTag(db);
    toggleMetaTag(post, tag);
  }, [db, post]);

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
      Obj.change(post, (post) => {
        const mutable = post as Obj.Mutable<typeof post>;
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
  }, [post, refreshing]);

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
        <PostContent post={post} metadata={feedName ? [feedName] : undefined} />
      </Panel.Content>
    </Panel.Root>
  );
};
