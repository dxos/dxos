//
// Copyright 2025 DXOS.org
//

// Deck companion — a workspace-wide panel that appears in the deck sidebar.
// Unlike plank companions (which are attached to specific objects), deck companions
// are global and registered via `AppNode.makeDeckCompanion` in the graph builder.
// The surface role uses the convention `deck-companion--{id}`.

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Next } from '@dxos/react-ui';

import { ActiveSpacePanel } from '#components';

export type SampleDeckCompanionProps = AppSurface.SpaceArticleProps;

export const SampleDeckCompanion = ({ space }: SampleDeckCompanionProps) => {
  return (
    <Next.Panel.Root>
      <Next.Panel.Header>
        <Next.Toolbar.Root />
      </Next.Panel.Header>
      <Next.Panel.Body>
        <ActiveSpacePanel spaceName={space.properties.name ?? space.id} />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

export default SampleDeckCompanion;

SampleDeckCompanion.displayName = 'SampleDeckCompanion';
