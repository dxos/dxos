//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Card, Icon } from '@dxos/react-ui';

import { Book } from '#types';

const STATUS_LABELS: Record<Book.Status, string> = {
  finished: 'Finished',
  reading: 'Reading',
  wantToRead: 'Want to read',
  abandoned: 'Abandoned',
};

/**
 * Collection-tile body for a book: cover, authors, status, rating.
 * The enclosing tile owns `Card.Root`/`Card.Header`; this renders only the body.
 */
export const BookCard = ({ subject }: AppSurface.ObjectCardProps<Book.Book>) => {
  const { coverUrl, authors = [], status, stars } = subject;
  return (
    <Card.Body>
      {coverUrl && (
        <Card.Row>
          <img src={coverUrl} alt='' className='is-16 rounded object-cover' />
        </Card.Row>
      )}
      {authors.length > 0 && (
        <Card.Row>
          <Card.Block>
            <Icon icon='ph--user--regular' />
          </Card.Block>
          <Card.Text truncate>{authors.join(', ')}</Card.Text>
        </Card.Row>
      )}
      {status && (
        <Card.Row>
          <Card.Block>
            <Icon icon='ph--bookmark-simple--regular' />
          </Card.Block>
          <Card.Text>{STATUS_LABELS[status]}</Card.Text>
        </Card.Row>
      )}
      {stars != null && (
        <Card.Row>
          <Card.Block>
            <Icon icon='ph--star--regular' />
          </Card.Block>
          <Card.Text>{stars} / 10</Card.Text>
        </Card.Row>
      )}
    </Card.Body>
  );
};
