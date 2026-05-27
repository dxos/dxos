//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback } from 'react';

import { useObject } from '@dxos/react-client/echo';
import { Card, Focus, IconButton } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type Magazine, type Subscription } from '#types';

import { formatDate } from '../../util/format-date';
import { getMagazinePostState, getSubscriptionPostState, updateSubscriptionPostState } from '../../util/post-state';

export type MagazineTileProps = {
  post: Subscription.Post;
  magazine: Magazine.Magazine;
  current?: boolean;
  feedName?: string;
  published?: string;
  onOpen?: (post: Subscription.Post) => void;
};

export const MagazineTile = ({ post, magazine, current, feedName, published, onOpen }: MagazineTileProps) => {
  useObject(post);
  const postId = (post as { id: string }).id;
  const subscription = post.source?.target;
  // Subscribe to the subscription so the tile re-renders when its postState
  // changes (star toggle, read tracking, content fetch).
  useObject(subscription);
  // Subscribe to the magazine for curation-cache updates (snippet).
  useObject(magazine);
  const userState = getSubscriptionPostState(subscription, postId);
  const curation = getMagazinePostState(magazine, postId);
  const read = Boolean(userState.readAt);
  const starred = Boolean(userState.starred);
  const imageUrl = userState.imageUrl;
  const snippet = curation.snippet;

  // `Focus.Item` calls `onCurrentChange` on click and on Enter.
  // For MagazineTile, "activate the current tile" means "open the post" — same effect as the previous direct onClick.
  const handleCurrentChange = useCallback(() => {
    onOpen?.(post);
  }, [onOpen, post]);

  const handleToggleStar = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      // Prevent Focus.Item's onClick from firing the open action — clicks on the star toggle should not open the post.
      event.stopPropagation();
      if (!subscription) {
        return;
      }
      const current = getSubscriptionPostState(subscription, postId);
      updateSubscriptionPostState(subscription, postId, {
        starred: !current.starred,
        ...(current.starred ? { starredAt: undefined } : { starredAt: new Date().toISOString() }),
      });
    },
    [subscription, postId],
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
