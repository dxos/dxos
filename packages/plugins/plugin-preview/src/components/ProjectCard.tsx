//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Card, cardNoSpacing, cardSpacing } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';

import { type PreviewProps } from '../types';

import { CardSubjectMenu } from './CardSubjectMenu';

export const ProjectCard = ({ subject, role }: PreviewProps<DataType.Project>) => {
  const { name, image, description } = subject;
  return (
    <Card.SurfaceRoot role={role}>
      {image && <Card.Poster image={image} alt={name} aspect='auto' />}
      <div role='none' className={mx('flex items-center gap-2', cardSpacing)}>
        <Card.Heading classNames={cardNoSpacing}>{name}</Card.Heading>
        <CardSubjectMenu subject={subject} />
      </div>
      {description && <Card.Text classNames='line-clamp-2'>{description}</Card.Text>}
    </Card.SurfaceRoot>
  );
};
