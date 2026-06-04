//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback } from 'react';

import { useObject } from '@dxos/react-client/echo';
import { Card, Focus, IconButton } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type Subscription } from '#types';

import { formatDate } from '../../util/format-date';
import { getImageUrl, getSnippet } from '../../util/post-state';

export type MagazineTileProps = {
  post: Subscription.Post;
  current?: boolean;
  /** Per-Post state owned by the parent (resolved from the Subscription's tags / read marker). */
  read?: boolean;
  starred?: boolean;
  onToggleStar?: (post: Subscription.Post) => void;
  feedName?: string;
  published?: string;
  onOpen?: (post: Subscription.Post) => void;
};

export const MagazineTile = ({
  post,
  current,
  read = false,
  starred = false,
  onToggleStar,
  feedName,
  published,
  onOpen,
}: MagazineTileProps) => {
  useObject(post);
  // snippet/imageUrl are derived from the Post's description (grid posts aren't content-fetched).
  const imageUrl = getImageUrl(post);
  const snippet = getSnippet(post) || undefined;

  // `Focus.Item` calls `onCurrentChange` on click and on Enter.
  // For MagazineTile, "activate the current tile" means "open the post" — same effect as the previous direct onClick.
  const handleCurrentChange = useCallback(() => {
    onOpen?.(post);
  }, [onOpen, post]);

  const handleToggleStar = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      // Prevent Focus.Item's onClick from firing the open action — clicks on the star toggle should not open the post.
      event.stopPropagation();
      onToggleStar?.(post);
    },
    [onToggleStar, post],
  );

  return (
    <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
      <Card.Root
        fullWidth
        classNames={mx('dx-hover dx-current cursor-pointer transition-opacity', read && !current && 'opacity-60')}
      >
        {imageUrl && (
          <Card.Poster alt={post.title ?? 'Article'} image={imageUrl} fit='cover' classNames='rounded-t-xs' />
        )}
        <Card.Header>
          <Card.IconBlock>
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
        </Card.Header>
        <Card.Body>
          {snippet && (
            <Card.Row>
              <Card.Text variant='description' classNames='line-clamp-3'>
                {snippet}
              </Card.Text>
            </Card.Row>
          )}
          <Card.Row>
            <div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-1.5 text-sm text-description overflow-hidden'>
              <span className='truncate'>{feedName ?? ''}</span>
              <span className='text-end shrink-0'>{published ?? ''}</span>
            </div>
          </Card.Row>
        </Card.Body>
      </Card.Root>
    </Focus.Item>
  );
};

/** Convenience: format a Post's published date the way the magazine view shows it. */
export const formatPublished = (post: Subscription.Post): string | undefined =>
  post.published ? formatDate(post.published) : undefined;
