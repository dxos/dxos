//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { Card, Focus, IconButton } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type Subscription } from '#types';

import { formatDate } from '../../util/format-date';
import { useMagazinePostData } from '../../state';

export type MagazineTileProps = {
  post: Subscription.Post;
  current?: boolean;
  onOpen?: (post: Subscription.Post) => void;
  onToggleStar?: (post: Subscription.Post, starred: boolean) => void;
};

export const MagazineTile = ({ post, current, onToggleStar, onOpen }: MagazineTileProps) => {
  // All per-Post derivation (snapshot, read, starred, snippet, image, feed name) happens in
  // atom-land; this tile re-renders only when THIS post's slice changes, not when a sibling does.
  const { post: snapshot, feedName, read, starred, snippet, imageUrl } = useMagazinePostData(post);

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
    <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
      <Card.Root
        fullWidth
        classNames={mx('dx-hover dx-current cursor-pointer transition-opacity', read && !current && 'opacity-60')}
      >
        {imageUrl && (
          <Card.Poster alt={snapshot.title ?? 'Article'} image={imageUrl} fit='cover' classNames='rounded-t-xs' />
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
          {snapshot.title ? <Card.Title classNames='line-clamp-2'>{snapshot.title}</Card.Title> : <div />}
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
              <span className='text-end shrink-0'>{formatPublished(snapshot) ?? ''}</span>
            </div>
          </Card.Row>
        </Card.Body>
      </Card.Root>
    </Focus.Item>
  );
};

/** Convenience: format a Post's published date the way the magazine view shows it. */
const formatPublished = (post: Obj.Snapshot<Subscription.Post>): string | undefined =>
  post.published ? formatDate(post.published) : undefined;
