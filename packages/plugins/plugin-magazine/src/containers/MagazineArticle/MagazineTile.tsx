//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback } from 'react';

import { Obj } from '@dxos/echo';
import * as Card from '@dxos/react-ui/Card';
import * as Layout from '@dxos/react-ui/Layout';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import { mx } from '@dxos/ui-theme';

import { useMagazinePostData } from '#atoms';
import { Magazine, Subscription } from '#types';

import { formatDate } from '../../util/date.ts';

export type MagazineTileProps = {
  post: Subscription.Post;
  magazine: Magazine.Magazine;
  current?: boolean;
  onToggleStar?: (post: Subscription.Post, starred: boolean) => void;
};

export const MagazineTile = ({ post, magazine, current, onToggleStar }: MagazineTileProps) => {
  // All per-Post derivation (snapshot, read, starred, snippet, image, feed name) happens in
  // atom-land; this tile re-renders only when THIS post's slice changes, not when a sibling does.
  const { post: snapshot, feedName, read, starred, snippet, imageUrl } = useMagazinePostData(post, magazine);
  const published = formatPublished(snapshot);

  const handleToggleStar = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      // The star is not the tile: its press must not reach the masonry item, which opens the post.
      event.stopPropagation();
      onToggleStar?.(post, starred);
    },
    [onToggleStar, post, starred],
  );

  return (
    // The masonry item around the tile takes focus and opens the post (`itemProps.onActivate`).
    <Card.Root
      aria-current={current || undefined}
      classNames={mx('dx-hover dx-current cursor-pointer transition-opacity', read && !current && 'opacity-60')}
    >
      {imageUrl && (
        <Card.Poster alt={snapshot.title ?? 'Article'} src={imageUrl} fit='cover' classNames='rounded-t-xs' />
      )}
      <Card.Header>
        {snapshot.title && <Card.Title lines={2}>{snapshot.title}</Card.Title>}
        <Layout.Block rail='end'>
          <SystemButton.Star variant='ghost' iconOnly iconSize='md' pressed={starred} onClick={handleToggleStar} />
        </Layout.Block>
      </Card.Header>
      <Card.Body>
        {snippet && (
          <Card.Row>
            <Card.Text variant='muted' lines={3}>
              {snippet}
            </Card.Text>
          </Card.Row>
        )}
        <Card.Row trailing={published && <Card.Text variant='muted'>{published}</Card.Text>}>
          <Card.Text variant='muted' truncate>
            {feedName}
          </Card.Text>
        </Card.Row>
      </Card.Body>
    </Card.Root>
  );
};

/** Convenience: format a Post's published date the way the magazine view shows it. */
const formatPublished = (post: Obj.Snapshot<Subscription.Post>): string | undefined =>
  post.published ? formatDate(post.published) : undefined;

MagazineTile.displayName = 'MagazineTile';
