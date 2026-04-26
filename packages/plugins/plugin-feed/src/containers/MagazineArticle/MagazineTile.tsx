//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent as ReactKeyboardEvent, type MouseEvent, useCallback } from 'react';

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
   * Pre-formatted published date string (e.g. "Apr 25, 2026"). Hoisted to a prop
   * so the parent owns formatting and the tile stays a pure renderer.
   */
  published?: string;
  /**
   * Canonical star Tag.Tag for the space, if one already exists. When the user
   * clicks the star icon and no star tag exists yet, one is created on demand
   * via `ensureStarTag`.
   */
  starTag?: Tag.Tag;
  onOpen?: (post: Subscription.Post) => void;
};

export const MagazineTile = ({ post, current, feedName, published, starTag, onOpen }: MagazineTileProps) => {
  // `useObject(post)` subscribes the tile to ECHO's reactive notifications,
  // so toggling a star tag (which writes to `Obj.getMeta(post).tags`)
  // re-renders the icon without a parent re-render forcing it.
  useObject(post);
  const read = Boolean(post.readAt);
  const metaParts = [feedName, post.author].filter((value): value is string => Boolean(value));
  const metaText = metaParts.join(' · ');
  const starred = hasMetaTag(post, starTag);

  const handleClick = useCallback(() => {
    onOpen?.(post);
  }, [onOpen, post]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      // Native click on a focused <div role="button"> via Enter/Space — needed
      // because the tile root isn't a real <button>. Keep the tile reachable
      // via Tabster's arrow navigation (which uses the tile's tabindex=0).
      if (event.key === 'Enter' || event.key === ' ') {
        // Don't preventDefault for inner controls (the star IconButton lives
        // inside): only fire when the focused element IS the tile itself.
        if (event.target === event.currentTarget) {
          event.preventDefault();
          onOpen?.(post);
        }
      }
    },
    [onOpen, post],
  );

  const handleToggleStar = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      // Prevent the parent Card's `onClick` from firing the open action.
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
    <Card.Root
      fullWidth
      role='button'
      tabIndex={0}
      onClick={handleClick}
      aria-current={current ? 'true' : undefined}
      // `onKeyDown` isn't in `CardRootOwnProps` but slottable's `...rest`
      // forwards it onto the rendered <div>. Needed because role='button'
      // on a non-<button> element doesn't natively fire click on
      // Enter/Space.
      // @ts-expect-error — onKeyDown not in CardRoot's typed prop pick.
      onKeyDown={handleKeyDown}
      classNames={mx(
        'dx-current dx-hover cursor-pointer transition-opacity',
        read && !current && 'opacity-60',
      )}
    >
      {post.imageUrl && <Card.Poster alt={post.title ?? 'Article'} image={post.imageUrl} />}
      <Card.Toolbar>
        {/* Empty col-1 placeholder so the title lands in the center column
            of the toolbar's 3-col subgrid (matching the snippet/last-row
            content alignment). Without this the title flows into the
            gutter and clips against the left edge. */}
        <div />
        {post.title ? <Card.Title classNames='line-clamp-2'>{post.title}</Card.Title> : <div className='grow' />}
      </Card.Toolbar>
      <Card.Content>
        {post.snippet && (
          <Card.Row>
            <Card.Text variant='description' classNames='line-clamp-3'>
              {post.snippet}
            </Card.Text>
          </Card.Row>
        )}
        {/* Last row — uses the same `col-span-3 grid grid-cols-subgrid`
            layout as Card.Row but renders a custom interactive star button
            in column 1 (where Card.Row's `icon` prop only accepts a string
            icon name). Column 2 holds feed/author meta; the published date
            is right-aligned at the end of column 2. */}
        <div role='none' className='col-span-3 grid grid-cols-subgrid items-center'>
          <Card.IconBlock padding>
            <IconButton
              variant='ghost'
              iconOnly
              size={4}
              // tabIndex=-1 keeps the star out of Tabster's arrow-nav order
              // (which uses `tabbable: true`), so up/down moves between
              // tiles instead of between star buttons. Mouse click still
              // works; keyboard users can toggle starred state via the
              // PostArticle toolbar's star button after opening the post.
              tabIndex={-1}
              label={starred ? 'Unstar' : 'Star'}
              icon={starred ? 'ph--star--fill' : 'ph--star--regular'}
              onClick={handleToggleStar}
            />
          </Card.IconBlock>
          <div className='flex items-center justify-between gap-2 min-w-0'>
            {metaText && (
              <Card.Text variant='description' classNames='truncate'>
                {metaText}
              </Card.Text>
            )}
            {published && (
              <Card.Text variant='description' classNames='shrink-0 text-end'>
                {published}
              </Card.Text>
            )}
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  );
};

/** Convenience: format a Post's published date the way the magazine view shows it. */
export const formatPublished = (post: Subscription.Post): string | undefined =>
  post.published ? formatDate(post.published) : undefined;
