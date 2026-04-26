//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback } from 'react';

import { Obj, type Tag } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Card, Focus, IconButton } from '@dxos/react-ui';
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
   * Pre-formatted published date string (e.g. "Apr 26, 2026"). Hoisted to a prop
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

  // `Focus.Item` calls `onCurrentChange` on click and on Enter. For
  // MagazineTile, "activate the current tile" means "open the post" — same
  // effect as the previous direct onClick.
  const handleCurrentChange = useCallback(() => {
    onOpen?.(post);
  }, [onOpen, post]);

  const handleToggleStar = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      // Prevent Focus.Item's onClick from firing the open action — clicks on
      // the star toggle should not open the post.
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
    // `Focus.Item` is the same primitive plugin-inbox uses on each
    // MessageStack/EventStack tile. It supplies:
    //   - tabIndex=0 (single tab stop per tile)
    //   - aria-current managed via `current` prop
    //   - click → onCurrentChange + Enter → onCurrentChange
    //   - tabster groupper that makes inner focusables (the star button)
    //     skip arrow navigation, so up/down moves between tiles, not stars.
    // `dx-hover dx-current` are merged onto Card.Root via asChild's Slot.
    <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
      <Card.Root
        fullWidth
        classNames={mx('dx-hover dx-current cursor-pointer transition-opacity', read && !current && 'opacity-60')}
      >
        {post.imageUrl && (
          // `rounded-t-xs` matches `Card.Root`'s `rounded-xs` corner so the
          // image's top corners don't poke through the card's rounded
          // outline. (The focus-ring stacking is fixed at the source — the
          // `Image` component now establishes its own stacking context via
          // `isolate`.)
          <Card.Poster alt={post.title ?? 'Article'} image={post.imageUrl} classNames='rounded-t-xs' />
        )}
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
    </Focus.Item>
  );
};

/** Convenience: format a Post's published date the way the magazine view shows it. */
export const formatPublished = (post: Subscription.Post): string | undefined =>
  post.published ? formatDate(post.published) : undefined;
