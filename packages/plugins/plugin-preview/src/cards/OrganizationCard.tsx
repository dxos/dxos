//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Card } from '@dxos/react-ui-mosaic';
import { type Organization } from '@dxos/types';

import { type CardPreviewProps } from '../types';

export const OrganizationCard = ({ subject }: CardPreviewProps<Organization.Organization>) => {
  const { name, image, description, website } = subject;

  return (
    <Card.Content>
      <Card.Poster
        alt={name ?? ''}
        {...(image ? { image } : { icon: 'ph--building-office--regular' })}
        classNames={!image && 'opacity-50'}
      />
      {description && (
        <Card.Row>
          <Card.Text variant='description'>{description}</Card.Text>
        </Card.Row>
      )}
      {website && <Card.Link label={website} href={website} />}
    </Card.Content>
  );
};
