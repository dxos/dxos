//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Subscription } from '#types';

import { formatDate } from '../../util/format-date';

export type PostArticleProps = AppSurface.ObjectArticleProps<Subscription.Post>;

export const PostArticle = ({ role, subject: post }: PostArticleProps) => {
  const { t } = useTranslation(meta.id);
  const metaLine = [post.author, formatDate(post.published)].filter(Boolean).join(' · ');

  const handleOpenOriginal = useCallback(() => {
    if (post.link) {
      window.open(post.link, '_blank', 'noopener,noreferrer');
    }
  }, [post.link]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
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
          {post.snippet && <p className='text-sm whitespace-pre-wrap'>{post.snippet}</p>}
        </article>
      </Panel.Content>
    </Panel.Root>
  );
};
