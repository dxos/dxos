//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Card } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';

import { CardHeader, CardLink } from '../components';
import { type PreviewProps } from '../types';

export const OrganizationCard = ({ children, subject, role, activeSpace }: PreviewProps<DataType.Organization>) => {
  const { name, image, description, website } = subject;

  return (
    <Card.SurfaceRoot role={role}>
      <Card.Poster alt={name ?? ''} {...(image ? { image } : { icon: 'ph--building-office--regular' })} />
      <CardHeader label={name} subject={subject} activeSpace={activeSpace} />
      {description && <Card.Text classNames='line-clamp-2'>{description}</Card.Text>}
      {website && <CardLink label={website} href={website} />}
      {children}
    </Card.SurfaceRoot>
  );
};
