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
  feedName?: string;
  published?: string;
  starTag?: Tag.Tag;
  onOpen?: (post: Subscription.Post) => void;
};

export const MagazineTile = ({ post, current, feedName, published, starTag, onOpen }: MagazineTileProps) => {
  useObject(post);
  const read = Boolean(post.readAt);
  const starred = hasMetaTag(post, starTag);

  // `Focus.Item` calls `onCurrentChange` on click and on Enter.
  // For MagazineTile, "activate the current tile" means "open the post" — same effect as the previous direct onClick.
  const handleCurrentChange = useCallback(() => {
    onOpen?.(post);
  }, [onOpen, post]);

  const handleToggleStar = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      // Prevent Focus.Item's onClick from firing the open action — clicks on the star toggle should not open the post.
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
    <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
      <Card.Root
        fullWidth
        classNames={mx('dx-hover dx-current cursor-pointer transition-opacity', read && !current && 'opacity-60')}
      >
        {post.imageUrl && (
          <Card.Poster alt={post.title ?? 'Article'} image={post.imageUrl} fit='cover' classNames='rounded-t-xs' />
        )}
        <Card.Toolbar>
          <Card.IconBlock padding>
            <IconButton
              variant='ghost'
              iconOnly
              square
              size={4}
              label={starred ? 'Unstar' : 'Star'}
              icon={starred ? 'ph--star--fill' : 'ph--star--regular'}
              onClick={handleToggleStar}
            />
          </Card.IconBlock>
          {post.title ? <Card.Title classNames='line-clamp-2'>{post.title}</Card.Title> : <div />}
          <Card.IconBlock />
        </Card.Toolbar>
        <Card.Content>
          {post.snippet && (
            <Card.Row>
              <Card.Text variant='description' classNames='line-clamp-3'>
                {post.snippet}
              </Card.Text>
            </Card.Row>
          )}
          <Card.Row>
            <div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-1.5 text-sm text-description overflow-hidden'>
              <span className='truncate'>{feedName ?? ''}</span>
              <span className='text-end shrink-0'>{published ?? ''}</span>
            </div>
          </Card.Row>
        </Card.Content>
      </Card.Root>
    </Focus.Item>
  );
};

/** Convenience: format a Post's published date the way the magazine view shows it. */
export const formatPublished = (post: Subscription.Post): string | undefined =>
  post.published ? formatDate(post.published) : undefined;
