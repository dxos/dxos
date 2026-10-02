//
// Copyright 2025 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Card from '@dxos/react-ui/Card';
import { type Organization } from '@dxos/types';

export const OrganizationCard = ({ subject }: AppSurface.ObjectCardProps<Organization.Organization>) => {
  const { name, image, description, website } = subject;

  return (
    <Card.Body>
      {image && <Card.Poster alt={name ?? ''} image={image} />}
      {description && (
        <Card.Row>
          <Card.Text variant='description'>{description}</Card.Text>
        </Card.Row>
      )}
      {website && <Card.Link label={website} href={website} />}
    </Card.Body>
  );
};
