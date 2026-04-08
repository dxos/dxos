//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit';
import { Card } from '@dxos/react-ui';
import { type Organization } from '@dxos/types';

export const OrganizationCard = ({ subject }: AppSurface.ObjectProps<Organization.Organization>) => {
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
