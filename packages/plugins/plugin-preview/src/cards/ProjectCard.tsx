//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { Card } from '@dxos/react-ui';
import { type Pipeline } from '@dxos/types';

export const ProjectCard = ({ subject }: AppSurface.ObjectProps<Pipeline.Pipeline>) => {
  const { image, description } = subject;

  return (
    <Card.Content>
      {image && <Card.Poster image={image} alt={Obj.getLabel(subject) ?? ''} aspect='auto' />}
      {/* <CardHeader label={name} subject={subject} db={db} /> */}
      {description && <Card.Text variant='description'>{description}</Card.Text>}
    </Card.Content>
  );
};
