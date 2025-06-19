//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Card } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';

import { type PreviewProps } from '../types';

export const ProjectCard = ({
  classNames,
  role,
  subject: { name, image, description },
}: PreviewProps<DataType.Project>) => {
  return (
    <Card.Content classNames={[role === 'popover' && 'popover-card-width', classNames]}>
      {image && <Card.Poster image={image} alt={name} />}
      <Card.Heading>{name}</Card.Heading>
      {description && <Card.Text classNames='line-clamp-2'>{description}</Card.Text>}
    </Card.Content>
  );
};
