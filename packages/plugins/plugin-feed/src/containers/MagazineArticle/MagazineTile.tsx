//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { mx } from '@dxos/ui-theme';

import { type Subscription } from '#types';

import { formatDate } from '../../util/format-date';

export type MagazineTileProps = {
  post: Subscription.Post;
  onOpen?: (post: Subscription.Post) => void;
};

export const MagazineTile = ({ post, onOpen }: MagazineTileProps) => {
  const read = Boolean(post.readAt);
  const date = formatDate(post.published);
  const metaParts = [post.author, date].filter((value): value is string => Boolean(value));
  const tags = post.tags ?? [];

  const handleClick = useCallback(() => {
    onOpen?.(post);
  }, [onOpen, post]);

  return (
    <button
      type='button'
      onClick={handleClick}
      className={mx(
        'flex flex-col gap-2 p-3 rounded-md text-start bg-input hover:bg-hoverSurface transition-opacity',
        read && 'opacity-60',
      )}
    >
      {post.imageUrl && (
        <img src={post.imageUrl} alt='' className='rounded w-full object-cover max-h-48' loading='lazy' />
      )}
      {post.title && <h3 className='font-semibold text-base line-clamp-2'>{post.title}</h3>}
      {post.snippet && <p className='text-sm text-description line-clamp-3'>{post.snippet}</p>}
      {metaParts.length > 0 && <div className='text-xs text-subdued'>{metaParts.join(' · ')}</div>}
      {tags.length > 0 && (
        <div className='flex flex-wrap gap-1'>
          {tags.map((tag, index) => (
            <span key={`${index}-${tag}`} className='text-xs bg-modalSurface px-2 py-0.5 rounded-full'>
              #{tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
};
