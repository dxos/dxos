//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback } from 'react';

import { Obj, type Tag } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Card, Icon } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type Subscription } from '#types';

import { formatDate } from '../../util/format-date';
import { ensureStarTag, hasMetaTag, toggleMetaTag } from '../../util/star-tag';

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
  // `useObject(post)` subscribes the tile to ECHO's reactive notifications,
  // so toggling a star tag (which writes to `Obj.getMeta(post).tags`)
  // re-renders the icon without a parent re-render forcing it.
  useObject(post);
  const read = Boolean(post.readAt);
  const date = formatDate(post.published);
  const metaParts = [feedName, post.author, date].filter((value): value is string => Boolean(value));
  const starred = hasMetaTag(post, starTag);

  const handleClick = useCallback(() => {
    onOpen?.(post);
  }, [onOpen, post]);

  const handleToggleStar = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      // Prevent the parent tile-button's `onOpen` from firing.
      event.stopPropagation();
      const db = Obj.getDatabase(post);
      if (!db) {
        return;
      }
      // Always reach for the canonical tag (creates one if missing) so the toggle is consistent
      // regardless of whether `starTag` was undefined at render time.
      const tag = ensureStarTag(db);
      toggleMetaTag(post, tag);
    },
    [post],
  );

  return (
    <Card.Root asChild fullWidth>
      <button
        type='button'
        aria-current={current ? 'true' : undefined}
        onClick={handleClick}
        className={mx(
          'dx-current dx-hover text-start cursor-pointer transition-opacity',
          read && !current && 'opacity-60',
        )}
      >
        {post.imageUrl && <Card.Poster alt={post.title ?? 'Article'} image={post.imageUrl} />}
        <Card.Toolbar>
          {post.title ? <Card.Title classNames='line-clamp-2'>{post.title}</Card.Title> : <div className='grow' />}
          {/* Star toggle. A nested <span role="button"> avoids the
              button-in-button HTML invalidity since the parent Card.Root is
              rendered as a <button> via `asChild`. `stopPropagation` keeps
              the parent's onOpen from firing. */}
          <Card.IconBlock padding>
            <span
              role='button'
              tabIndex={0}
              aria-label={starred ? 'Unstar' : 'Star'}
              title={starred ? 'Unstar' : 'Star'}
              onClick={handleToggleStar}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleToggleStar(event as unknown as MouseEvent<HTMLElement>);
                }
              }}
              className='grid place-items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-accentSurface rounded-sm'
            >
              <Icon icon={starred ? 'ph--star--fill' : 'ph--star--regular'} size={4} />
            </span>
          </Card.IconBlock>
        </Card.Toolbar>
        <Card.Content>
          {post.snippet && (
            <Card.Row>
              <Card.Text variant='description' classNames='line-clamp-3'>
                {post.snippet}
              </Card.Text>
            </Card.Row>
          )}
          {metaParts.length > 0 && (
            <Card.Row>
              <Card.Text variant='description'>{metaParts.join(' · ')}</Card.Text>
            </Card.Row>
          )}
        </Card.Content>
      </button>
    </Card.Root>
  );
};
