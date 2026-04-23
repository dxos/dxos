//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Button, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Subscription } from '#types';

import { formatDate } from '../../util/format-date';

export type PostArticleProps = AppSurface.ObjectArticleProps<Subscription.Post>;

export const PostArticle = ({ subject: post }: PostArticleProps) => {
  const { t } = useTranslation(meta.id);
  const meta1 = [post.author, formatDate(post.published)].filter(Boolean).join(' · ');

  return (
    <article className='flex flex-col gap-3 p-4 overflow-y-auto h-full'>
      {post.title && <h2 className='text-lg font-semibold'>{post.title ?? t('post-title.placeholder')}</h2>}
      {meta1 && <div className='text-xs text-subdued'>{meta1}</div>}
      {post.imageUrl && <img src={post.imageUrl} alt='' className='rounded w-full object-cover max-h-72' />}
      {post.snippet && <p className='text-sm whitespace-pre-wrap'>{post.snippet}</p>}
      {post.link && (
        <div>
          <Button asChild>
            <a href={post.link} target='_blank' rel='noopener noreferrer'>
              {t('open-original.label')}
            </a>
          </Button>
        </div>
      )}
    </article>
  );
};
