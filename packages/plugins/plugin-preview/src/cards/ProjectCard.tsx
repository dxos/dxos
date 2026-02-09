//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { Card } from '@dxos/react-ui-mosaic';
import { type Project } from '@dxos/types';

export const ProjectCard = ({ subject }: SurfaceComponentProps<Project.Project>) => {
  const { name, image, description } = subject;

  return (
    <Card.Content>
      {image && <Card.Poster image={image} alt={Obj.getLabel(subject) ?? ''} aspect='auto' />}
      {/* <CardHeader label={name} subject={subject} db={db} /> */}
      {description && <Card.Text variant='description'>{description}</Card.Text>}
    </Card.Content>
  );
};
