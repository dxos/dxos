//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Card } from '@dxos/react-ui';

import { SpacetimeEditor } from '#components';
import { type Scene } from '#types';

export type SceneCardProps = AppSurface.ObjectCardProps<Scene.Scene>;

/** Card-content preview of a scene: the canvas from its default pose, not interactive. */
export const SceneCard = ({ subject }: SceneCardProps) => (
  <Card.Body>
    <Card.Section classNames='aspect-square'>
      {/* The section centres its row; stretched, so the canvas below gets the square's height. */}
      <Card.Row fullWidth classNames='self-stretch'>
        <SpacetimeEditor.Root scene={subject}>
          {/* A preview in a grid must not take the wheel from the grid's scroll. */}
          <SpacetimeEditor.Canvas classNames='h-full pointer-events-none' showFps={false} />
        </SpacetimeEditor.Root>
      </Card.Row>
    </Card.Section>
  </Card.Body>
);

SceneCard.displayName = 'SceneCard';

export default SceneCard;
