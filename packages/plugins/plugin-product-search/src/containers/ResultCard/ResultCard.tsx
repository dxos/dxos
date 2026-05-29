//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Card } from '@dxos/react-ui';

import { type Result } from '../../types/Result';

export type ResultCardProps = {
  subject: Result;
  current?: boolean;
};

export const ResultCard = ({ subject, current }: ResultCardProps) => {
  const imageUrl = subject.images?.[0];

  return (
    <Card.Root fullWidth classNames={['dx-hover cursor-pointer', current && 'dx-current']}>
      {imageUrl && <Card.Poster alt={subject.title ?? 'Product'} image={imageUrl} fit='cover' classNames='rounded-t-xs' />}
      <Card.Header>
        <Card.Title classNames='line-clamp-2'>{subject.title}</Card.Title>
      </Card.Header>
      {(subject.price != null || subject.currency) && (
        <Card.Body>
          <Card.Row>
            <span className='text-sm text-description'>
              {subject.price != null ? subject.price : ''}
              {subject.currency ? ` ${subject.currency}` : ''}
            </span>
          </Card.Row>
        </Card.Body>
      )}
    </Card.Root>
  );
};
