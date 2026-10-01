//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Next } from '@dxos/react-ui/next';

import { SpacetimeEditor } from '#components';
import { type Scene } from '#types';

export type SceneCardProps = AppSurface.ObjectCardProps<Scene.Scene>;

/** Card-content preview of a scene: the canvas from its default pose, not interactive. */
export const SceneCard = ({ subject }: SceneCardProps) => (
  <Next.Card.Body>
    <Next.Card.Section classNames='aspect-square'>
      {/* The section centres its row; stretched, so the canvas below gets the square's height. */}
      <Next.Card.Row classNames='self-stretch'>
        <SpacetimeEditor.Root scene={subject}>
          {/* A preview in a grid must not take the wheel from the grid's scroll. */}
          <SpacetimeEditor.Canvas classNames='h-full pointer-events-none' showFps={false} />
        </SpacetimeEditor.Root>
      </Next.Card.Row>
    </Next.Card.Section>
  </Next.Card.Body>
);

SceneCard.displayName = 'SceneCard';

export default SceneCard;
