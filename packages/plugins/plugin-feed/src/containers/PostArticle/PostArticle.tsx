//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { Subscription } from '#types';

import { ensureStarTag, formatDate, hasMetaTag, toggleMetaTag, useStarTag } from '../../util';

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

  const metaLine = [post.author, feedName, formatDate(post.published)].filter(Boolean).join(' · ');
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
        <ScrollArea.Root orientation='vertical' thin>
          <ScrollArea.Viewport>
            <article className='flex flex-col gap-3 p-4'>
              <h1 className='text-xl font-semibold'>{post.title ?? t('post-title.placeholder')}</h1>
              {metaLine && <div className='text-xs text-subdued'>{metaLine}</div>}
              {post.imageUrl && <img src={post.imageUrl} alt='' className='rounded w-full object-cover max-h-72' />}
              {(post.content || post.snippet) && <p className='whitespace-pre-wrap'>{post.content ?? post.snippet}</p>}
            </article>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
