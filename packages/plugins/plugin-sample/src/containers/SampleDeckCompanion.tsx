//
// Copyright 2025 DXOS.org
//

// Deck companion — a workspace-wide panel that appears in the deck sidebar.
// Unlike plank companions (which are attached to specific objects), deck companions
// are global and registered via `AppNode.makeDeckCompanion` in the graph builder.
// The surface role uses the convention `deck-companion--{id}`.

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Panel, Toolbar } from '@dxos/react-ui';

import { ActiveSpacePanel } from '#components';

export type SampleDeckCompanionProps = AppSurface.SpaceArticleProps;

export const SampleDeckCompanion = ({ space }: SampleDeckCompanionProps) => {
  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <Panel.Content>
        <ActiveSpacePanel spaceName={space.properties.name ?? space.id} />
      </Panel.Content>
    </Panel.Root>
  );
};

export default SampleDeckCompanion;
