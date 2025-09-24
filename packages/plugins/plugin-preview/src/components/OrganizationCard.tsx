//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Icon } from '@dxos/react-ui';
import { Card, cardNoSpacing, cardSpacing } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';

import { type PreviewProps } from '../types';

import { CardSubjectMenu } from './CardSubjectMenu';

export const OrganizationCard = ({ children, subject, role }: PreviewProps<DataType.Organization>) => {
  const { name, image, description, website } = subject;
  return (
    <Card.SurfaceRoot role={role}>
      <Card.Poster alt={name!} {...(image ? { image } : { icon: 'ph--building-office--regular' })} />
      <div role='none' className={mx('flex items-center gap-2', cardSpacing)}>
        <Card.Heading classNames={cardNoSpacing}>{name}</Card.Heading>
        <CardSubjectMenu subject={subject} />
      </div>
      {description && <Card.Text classNames='line-clamp-2'>{description}</Card.Text>}
      {website && (
        <Card.Chrome>
          <a
            className='dx-button dx-focus-ring gap-2'
            data-variant='ghost'
            href={website}
            target='_blank'
            rel='noreferrer'
          >
            <Icon icon='ph--link--regular' size={5} classNames='text-subdued' />
            <span className='min-is-0 flex-1 truncate'>{website}</span>
            <Icon icon='ph--arrow-square-out--regular' />
          </a>
        </Card.Chrome>
      )}
      {children}
    </Card.SurfaceRoot>
  );
};
