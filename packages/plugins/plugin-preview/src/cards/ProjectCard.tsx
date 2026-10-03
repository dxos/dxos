//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Card } from '@dxos/react-ui';
import { type Pipeline } from '@dxos/types';

export const ProjectCard = ({ subject }: AppSurface.ObjectCardProps<Pipeline.Pipeline>) => {
  const { image, description } = subject;

  return (
    <Card.Body>
      {image && <Card.Poster src={image} alt={Obj.getLabel(subject) ?? ''} aspectRatio='auto' />}
      {/* <CardHeader label={name} subject={subject} db={db} /> */}
      {description && (
        <Card.Row>
          <Card.Text variant='description'>{description}</Card.Text>
        </Card.Row>
      )}
    </Card.Body>
  );
};
