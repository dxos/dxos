//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { Next } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useMagazinePostData } from '#atoms';
import { Magazine, Subscription } from '#types';

import { formatDate } from '../../util/date.ts';

export type MagazineTileProps = {
  post: Subscription.Post;
  magazine: Magazine.Magazine;
  current?: boolean;
  onOpen?: (post: Subscription.Post) => void;
  onToggleStar?: (post: Subscription.Post, starred: boolean) => void;
};

export const MagazineTile = ({ post, magazine, current, onToggleStar, onOpen }: MagazineTileProps) => {
  // All per-Post derivation (snapshot, read, starred, snippet, image, feed name) happens in
  // atom-land; this tile re-renders only when THIS post's slice changes, not when a sibling does.
  const { post: snapshot, feedName, read, starred, snippet, imageUrl } = useMagazinePostData(post, magazine);

  // `Focus.Item` calls `onCurrentChange` on click and on Enter.
  const handleCurrentChange = useCallback(() => {
    onOpen?.(post);
  }, [onOpen, post]);

  const handleToggleStar = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      // Prevent Focus.Item's onClick from firing the open action — clicks on the star toggle should not open the post.
      event.stopPropagation();
      onToggleStar?.(post, starred);
    },
    [onToggleStar, post, starred],
  );

  return (
    <Next.Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
      <Next.Card.Root
        classNames={mx('dx-hover dx-current cursor-pointer transition-opacity', read && !current && 'opacity-60')}
      >
        {imageUrl && (
          <Next.Card.Poster alt={snapshot.title ?? 'Article'} src={imageUrl} fit='cover' classNames='rounded-t-xs' />
        )}
        <Next.Card.Header>
          <Next.Block>
            <Next.SystemButton.Star
              variant='ghost'
              iconOnly
              iconSize='md'
              pressed={starred}
              onClick={handleToggleStar}
            />
          </Next.Block>
          {snapshot.title ? <Next.Card.Title lines={2}>{snapshot.title}</Next.Card.Title> : <div />}
          <Next.Block rail='end' />
        </Next.Card.Header>
        <Next.Card.Body>
          {snippet && (
            <Next.Card.Row>
              <Next.Card.Text variant='description' classNames='line-clamp-3'>
                {snippet}
              </Next.Card.Text>
            </Next.Card.Row>
          )}
          <Next.Card.Row>
            <div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-trim-sm py-trim-xs text-sm text-description overflow-hidden'>
              <span className='truncate'>{feedName ?? ''}</span>
              <span className='text-end shrink-0'>{formatPublished(snapshot) ?? ''}</span>
            </div>
          </Next.Card.Row>
        </Next.Card.Body>
      </Next.Card.Root>
    </Next.Focus.Item>
  );
};

/** Convenience: format a Post's published date the way the magazine view shows it. */
const formatPublished = (post: Obj.Snapshot<Subscription.Post>): string | undefined =>
  post.published ? formatDate(post.published) : undefined;

MagazineTile.displayName = 'MagazineTile';
