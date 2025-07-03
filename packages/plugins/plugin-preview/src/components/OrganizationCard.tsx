//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Icon } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';

import { type PreviewProps } from '../types';

export const OrganizationCard = ({
  children,
  subject: { name, image, description, website },
  role,
}: PreviewProps<DataType.Organization>) => {
  return (
    <Card.Container role={role}>
      <Card.Poster alt={name!} {...(image ? { image } : { icon: 'ph--building-office--regular' })} />
      <Card.Heading>{name}</Card.Heading>
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
            <span className='grow'>{website}</span>
            <Icon icon='ph--arrow-square-out--regular' />
          </a>
        </Card.Chrome>
      )}
      {children}
    </Card.Container>
  );
};
