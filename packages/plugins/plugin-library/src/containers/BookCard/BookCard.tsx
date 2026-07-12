//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Card } from '@dxos/react-ui';

import { Book } from '#types';

/**
 * Collection-tile body for a book, mirroring the Organization card: cover poster, authors, and a
 * publication-year / personal-rating line. The enclosing tile owns `Card.Root`/`Card.Header`/
 * `Card.Title`; this renders the body from the book's catalog metadata and the user's own rating.
 */
export const BookCard = ({ subject }: AppSurface.ObjectCardProps<Book.Book>) => {
  const { catalog, stars } = subject;
  const cover = catalog?.cover ?? catalog?.thumbnail;
  const authors = catalog?.authors ?? [];
  const meta = [catalog?.publicationYear, stars != null ? `★ ${stars}/10` : undefined].filter(Boolean).join(' · ');

  return (
    <Card.Body>
      {cover && <Card.Poster image={cover} alt={catalog?.title ?? ''} aspect='auto' fit='contain' />}
      {authors.length > 0 && (
        <Card.Row>
          <Card.Text variant='description' truncate>
            {authors.join(', ')}
          </Card.Text>
        </Card.Row>
      )}
      {meta && (
        <Card.Row>
          <Card.Text variant='description'>{meta}</Card.Text>
        </Card.Row>
      )}
    </Card.Body>
  );
};
