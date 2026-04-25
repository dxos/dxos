//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Subscription } from '#types';

import { formatDate } from '../../util';

export type PostArticleProps = AppSurface.ObjectArticleProps<Subscription.Post>;

const STAR_TAG = 'starred';

export const PostArticle = ({ role, subject: post }: PostArticleProps) => {
  const { t } = useTranslation(meta.id);
  const metaLine = [post.author, post.feed?.target?.name, formatDate(post.published)].filter(Boolean).join(' · ');
  const archived = Boolean(post.archived);
  const starred = (post.tags ?? []).includes(STAR_TAG);

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
    Obj.change(post, (post) => {
      const mutable = post as Obj.Mutable<typeof post>;
      const current = mutable.tags ?? [];
      mutable.tags = current.includes(STAR_TAG) ? current.filter((tag) => tag !== STAR_TAG) : [...current, STAR_TAG];
    });
  }, [post]);

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
              {(post.content || post.snippet) && (
                <p className='whitespace-pre-wrap'>{post.content ?? post.snippet}</p>
              )}
            </article>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
