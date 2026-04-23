//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Button, Dialog, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Subscription } from '#types';

import { formatDate } from '../../util/format-date';

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
        <Dialog.Content classNames='md:max-is-prose'>
          {post && (
            <>
              <Dialog.Header>
                <Dialog.Title>{post.title ?? t('post-title.placeholder')}</Dialog.Title>
                <Dialog.Close asChild>
                  <Dialog.CloseIconButton />
                </Dialog.Close>
              </Dialog.Header>
              <Dialog.Body classNames='flex flex-col gap-3'>
                {post.imageUrl && <img src={post.imageUrl} alt='' className='rounded w-full object-cover max-h-64' />}
                {(post.author || post.published) && (
                  <div className='text-xs text-subdued'>
                    {[post.author, formatDate(post.published)].filter(Boolean).join(' · ')}
                  </div>
                )}
                {post.snippet && <p className='text-sm whitespace-pre-wrap'>{post.snippet}</p>}
              </Dialog.Body>
              <Dialog.ActionBar>
                {post.link && (
                  <Button asChild>
                    <a href={post.link} target='_blank' rel='noopener noreferrer'>
                      {t('open-original.label')}
                    </a>
                  </Button>
                )}
                <Dialog.Close asChild>
                  <Button variant='primary'>{t('close.label')}</Button>
                </Dialog.Close>
              </Dialog.ActionBar>
            </>
          )}
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  );
};
