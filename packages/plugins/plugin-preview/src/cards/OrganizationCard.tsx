//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Next } from '@dxos/react-ui';
import { type Organization } from '@dxos/types';

export const OrganizationCard = ({ subject }: AppSurface.ObjectCardProps<Organization.Organization>) => {
  const { name, image, description, website } = subject;

  return (
    <Next.Card.Body>
      {image && <Next.Card.Poster alt={name ?? ''} src={image} />}
      {description && (
        <Next.Card.Row>
          <Next.Card.Text variant='description'>{description}</Next.Card.Text>
        </Next.Card.Row>
      )}
      {website && <Next.Card.Link label={website} href={website} />}
    </Next.Card.Body>
  );
};
