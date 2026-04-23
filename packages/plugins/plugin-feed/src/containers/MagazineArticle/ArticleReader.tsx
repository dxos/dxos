//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Button, Dialog, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Subscription } from '#types';

export type ArticleReaderProps = {
  post: Subscription.Post | undefined;
  onOpenChange: (open: boolean) => void;
};

export const ArticleReader = ({ post, onOpenChange }: ArticleReaderProps) => {
  const { t } = useTranslation(meta.id);
  const open = Boolean(post);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Overlay>
        <Dialog.Content>
          {post && (
            <>
              <Dialog.Title>{post.title ?? t('post-title.placeholder')}</Dialog.Title>
              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt=''
                  className='rounded w-full object-cover max-h-64'
                />
              )}
              {post.author || post.published ? (
                <div className='text-xs text-subdued'>
                  {[post.author, formatDate(post.published)].filter(Boolean).join(' · ')}
                </div>
              ) : null}
              {post.snippet && <p className='text-sm whitespace-pre-wrap'>{post.snippet}</p>}
              <Dialog.ActionBar>
                {post.link && (
                  <Button asChild>
                    <a href={post.link} target='_blank' rel='noopener noreferrer'>
                      {t('open-original.label')}
                    </a>
                  </Button>
                )}
                <Dialog.Close asChild>
                  <Button>{t('close.label')}</Button>
                </Dialog.Close>
              </Dialog.ActionBar>
            </>
          )}
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

const formatDate = (iso?: string): string | undefined => {
  if (!iso) {
    return undefined;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};
