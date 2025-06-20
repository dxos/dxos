//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Card } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';

import { type PreviewProps } from '../types';

export const ProjectCard = ({ subject: { name, image, description }, role }: PreviewProps<DataType.Project>) => {
  return (
    <Card.Container role={role}>
      {image && <Card.Poster image={image} alt={name} aspect='auto' />}
      <Card.Heading>{name}</Card.Heading>
      {description && <Card.Text classNames='line-clamp-2'>{description}</Card.Text>}
    </Card.Container>
  );
};
