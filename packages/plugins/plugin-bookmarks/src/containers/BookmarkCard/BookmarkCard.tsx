//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Next } from '@dxos/react-ui/next';

import { Bookmark } from '#types';

import { useImageLoads } from '../useImageLoads.ts';

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
    <Next.Card.Body>
      {bookmark.image && imageLoads && (
        <Next.Card.Poster alt={bookmark.title} image={bookmark.image} fit='cover' classNames='rounded-t-xs' />
      )}
      <Next.Card.Row>
        <Next.Card.Title lines={2}>{bookmark.title}</Next.Card.Title>
      </Next.Card.Row>
      {bookmark.excerpt && (
        <Next.Card.Row>
          <Next.Card.Text variant='description' classNames='line-clamp-3'>
            {bookmark.excerpt}
          </Next.Card.Text>
        </Next.Card.Row>
      )}
      <Next.Card.Link label={bookmark.url} href={bookmark.url} />
    </Next.Card.Body>
  );
};

export default BookmarkCard;

BookmarkCard.displayName = 'BookmarkCard';
