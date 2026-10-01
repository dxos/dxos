//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Next } from '@dxos/react-ui/next';
import { type Pipeline } from '@dxos/types';

export const ProjectCard = ({ subject }: AppSurface.ObjectCardProps<Pipeline.Pipeline>) => {
  const { image, description } = subject;

  return (
    <Next.Card.Body>
      {image && <Next.Card.Poster src={image} alt={Obj.getLabel(subject) ?? ''} aspectRatio='auto' />}
      {/* <CardHeader label={name} subject={subject} db={db} /> */}
      {description && (
        <Next.Card.Row>
          <Next.Card.Text variant='description'>{description}</Next.Card.Text>
        </Next.Card.Row>
      )}
    </Next.Card.Body>
  );
};
