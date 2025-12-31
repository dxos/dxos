//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Card } from '@dxos/react-ui-stack';
import { type Organization } from '@dxos/types';

import { CardHeader, CardLink } from '../components';
import { type CardPreviewProps } from '../types';

export const OrganizationCard = ({ children, subject, role, db }: CardPreviewProps<Organization.Organization>) => {
  const { name, image, description, website } = subject;

  return (
    <Card.SurfaceRoot id={subject.id} role={role}>
      <CardHeader label={name} subject={subject} db={db} />
      <Card.Poster
        alt={name ?? ''}
        {...(image ? { image } : { icon: 'ph--building-office--regular' })}
        classNames={!image && 'opacity-50'}
      />
      {description && <Card.Text classNames='line-clamp-2'>{description}</Card.Text>}
      {website && <CardLink label={website} href={website} />}
      {children}
    </Card.SurfaceRoot>
  );
};
