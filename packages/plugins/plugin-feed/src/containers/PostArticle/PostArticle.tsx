//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Subscription } from '#types';

import { formatDate } from '../../util';

export type PostArticleProps = AppSurface.ObjectArticleProps<Subscription.Post>;

export const PostArticle = ({ role, subject: post }: PostArticleProps) => {
  const { t } = useTranslation(meta.id);
  const metaLine = [post.author, formatDate(post.published)].filter(Boolean).join(' · ');

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

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
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
      <Panel.Content>
        <article className='flex flex-col gap-3 p-4 overflow-y-auto h-full'>
          <h1 className='text-xl font-semibold'>{post.title ?? t('post-title.placeholder')}</h1>
          {metaLine && <div className='text-xs text-subdued'>{metaLine}</div>}
          {post.imageUrl && <img src={post.imageUrl} alt='' className='rounded w-full object-cover max-h-72' />}
          {(post.content || post.snippet) && <p className='whitespace-pre-wrap'>{post.content ?? post.snippet}</p>}
        </article>
      </Panel.Content>
    </Panel.Root>
  );
};
