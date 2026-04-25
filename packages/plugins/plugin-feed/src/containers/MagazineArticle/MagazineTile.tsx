//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { mx } from '@dxos/ui-theme';

import { type Subscription } from '#types';

import { formatDate } from '../../util/format-date';

export type MagazineTileProps = {
  post: Subscription.Post;
  current?: boolean;
  /**
   * Source feed name. Passed in from `MagazineArticle` so the value updates reactively
   * via the parent's `useQuery(Filter.type(Subscription.Feed))`. Resolving the ref
   * inline (`post.feed?.target?.name`) doesn't trigger a re-render here when the
   * feed loads asynchronously.
   */
  feedName?: string;
  onOpen?: (post: Subscription.Post) => void;
};

export const MagazineTile = ({ post, current, feedName, onOpen }: MagazineTileProps) => {
  const read = Boolean(post.readAt);
  const date = formatDate(post.published);
  const metaParts = [post.author, feedName, date].filter((value): value is string => Boolean(value));
  const tags = post.tags ?? [];

  const handleClick = useCallback(() => {
    onOpen?.(post);
  }, [onOpen, post]);

  return (
    <button
      type='button'
      aria-current={current ? 'true' : undefined}
      onClick={handleClick}
      className={mx(
        'dx-current dx-hover flex flex-col gap-2 p-3 rounded-md text-start bg-input transition-opacity',
        read && !current && 'opacity-60',
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
