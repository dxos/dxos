//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { Card } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';

import { CardHeader } from '../components';
import { type PreviewProps } from '../types';

export const ProjectCard = ({ subject, role, activeSpace }: PreviewProps<DataType.Project>) => {
  const { name, image, description } = subject;

  return (
    <Card.SurfaceRoot role={role}>
      {image && <Card.Poster image={image} alt={Obj.getLabel(subject) ?? ''} aspect='auto' />}
      <CardHeader label={name} subject={subject} activeSpace={activeSpace} />
      {description && <Card.Text classNames='line-clamp-2'>{description}</Card.Text>}
    </Card.SurfaceRoot>
  );
};
