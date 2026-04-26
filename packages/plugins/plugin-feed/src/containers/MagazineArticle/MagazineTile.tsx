//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback } from 'react';

import { Obj, type Tag } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Card, IconButton } from '@dxos/react-ui';
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
    (event: MouseEvent<HTMLButtonElement>) => {
      // Prevent the parent Card's `onClick` from firing the open action.
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
    <Card.Root
      fullWidth
      onClick={handleClick}
      aria-current={current ? 'true' : undefined}
      classNames={mx(
        'dx-current dx-hover cursor-pointer transition-opacity',
        read && !current && 'opacity-60',
      )}
    >
      {post.imageUrl && <Card.Poster alt={post.title ?? 'Article'} image={post.imageUrl} />}
      <Card.Toolbar>
        {post.title ? <Card.Title classNames='line-clamp-2'>{post.title}</Card.Title> : <div className='grow' />}
        <Card.IconBlock padding>
          <IconButton
            iconOnly
            variant='ghost'
            size={4}
            label={starred ? 'Unstar' : 'Star'}
            icon={starred ? 'ph--star--fill' : 'ph--star--regular'}
            onClick={handleToggleStar}
          />
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
    </Card.Root>
  );
};
