//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Card } from '@dxos/react-ui';

import { type Bookmark } from '#types';

import { useImageLoads } from '../useImageLoads';

export type BookmarkCardProps = AppSurface.ObjectCardProps<Bookmark.Bookmark>;

/**
 * Compact preview of a {@link Bookmark.Bookmark}. Rendered into the
 * `AppSurface.CardContent` slot — Card.Root is supplied by the surface host
 * (popovers, sections, related-objects), so the body emits Card.Body only.
 */
export const BookmarkCard = ({ subject }: BookmarkCardProps) => {
  const [bookmark] = useObject(subject);
  const imageLoads = useImageLoads(bookmark.image);

  return (
    <Card.Body>
      {bookmark.image && imageLoads && (
        <Card.Poster alt={bookmark.title} image={bookmark.image} fit='cover' classNames='rounded-t-xs' />
      )}
      <Card.Row>
        <Card.Title classNames='line-clamp-2'>{bookmark.title}</Card.Title>
      </Card.Row>
      {bookmark.excerpt && (
        <Card.Row>
          <Card.Text variant='description' classNames='line-clamp-3'>
            {bookmark.excerpt}
          </Card.Text>
        </Card.Row>
      )}
      <Card.Link label={bookmark.url} href={bookmark.url} />
    </Card.Body>
  );
};

export default BookmarkCard;

BookmarkCard.displayName = 'BookmarkCard';
