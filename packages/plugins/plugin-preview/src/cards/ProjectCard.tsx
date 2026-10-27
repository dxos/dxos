//
// Copyright 2025 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as Card from '@dxos/react-ui/Card';
import { type Pipeline } from '@dxos/types';

export const ProjectCard = ({ subject }: AppSurface.ObjectCardProps<Pipeline.Pipeline>) => {
  const [project] = useObject(subject);
  const { image, description } = project;

  return (
    <Card.Body>
      {image && <Card.Poster src={image} alt={Obj.getLabel(project) ?? ''} aspectRatio='auto' />}
      {/* <CardHeader label={name} subject={subject} db={db} /> */}
      {description && (
        <Card.Row>
          <Card.Text variant='muted'>{description}</Card.Text>
        </Card.Row>
      )}
    </Card.Body>
  );
};
