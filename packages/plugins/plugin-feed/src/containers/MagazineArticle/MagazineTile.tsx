//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback } from 'react';

import { Obj, type Tag } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Icon } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type Subscription } from '#types';

import { ensureStarTag, hasMetaTag, toggleMetaTag } from '../../util/star-tag';
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
  /**
   * Canonical star Tag.Tag for the space, if one already exists. When the user
   * clicks the star icon and no star tag exists yet, one is created on demand
   * via `ensureStarTag`.
   */
  starTag?: Tag.Tag;
  onOpen?: (post: Subscription.Post) => void;
};

export const MagazineTile = ({ post, current, feedName, starTag, onOpen }: MagazineTileProps) => {
  // `useObject(post)` subscribes the tile to ECHO's reactive notifications, so
  // toggling a star tag (which writes to `Obj.getMeta(post).tags`) re-renders
  // the icon without a parent re-render forcing it.
  useObject(post);
  const read = Boolean(post.readAt);
  const date = formatDate(post.published);
  const metaParts = [post.author, feedName, date].filter((value): value is string => Boolean(value));
  const tags = post.tags ?? [];
  const starred = hasMetaTag(post, starTag);

  const handleClick = useCallback(() => {
    onOpen?.(post);
  }, [onOpen, post]);

  const handleToggleStar = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      // Prevent the parent tile-button's `onOpen` from firing.
      event.stopPropagation();
      const db = Obj.getDatabase(post);
      if (!db) {
        return;
      }
      // Always reach for the canonical tag (creates one if missing) so the
      // toggle is consistent regardless of whether `starTag` was undefined
      // at render time.
      const tag = ensureStarTag(db);
      toggleMetaTag(post, tag);
    },
    [post],
  );

  return (
    <button
      type='button'
      aria-current={current ? 'true' : undefined}
      onClick={handleClick}
      className={mx(
        'dx-current dx-hover flex flex-col gap-2 p-3 rounded-md text-start bg-input transition-opacity relative',
        read && !current && 'opacity-60',
      )}
    >
      {post.imageUrl && (
        <img src={post.imageUrl} alt='' className='rounded w-full object-cover max-h-48' loading='lazy' />
      )}
      {/* Star toggle, top-right. Uses a nested <span role="button"> rather than
          a <button> to avoid an HTML invalidity (button-in-button); the click
          is handled via the parent <button>'s click bubbling and stopped via
          the toggle's own onClick. */}
      <span
        role='button'
        tabIndex={0}
        aria-label={starred ? 'Unstar' : 'Star'}
        title={starred ? 'Unstar' : 'Star'}
        onClick={handleToggleStar}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleToggleStar(event as unknown as MouseEvent<HTMLButtonElement>);
          }
        }}
        className={mx(
          'absolute top-2 right-2 z-10 grid place-items-center w-6 h-6 rounded-full bg-baseSurface/80 backdrop-blur',
          'cursor-pointer hover:bg-baseSurface focus:outline-none focus:ring-2 focus:ring-accentSurface',
        )}
      >
        <Icon icon={starred ? 'ph--star--fill' : 'ph--star--regular'} size={4} />
      </span>
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
