//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { ActionToolbar, MenuBuilder, graphActions, isToolbarAction, useMenuBuilder } from '@dxos/react-ui-menu/next';
import { Next } from '@dxos/react-ui/next';

export type EmptyPanelProps = {
  label: string;
  attendableId?: string;
};

/**
 * The storyboard's main panel with nothing to show: a message, and the storyboard node's toolbar
 * actions (Play) all the same.
 */
export const EmptyPanel = ({ label, attendableId }: EmptyPanelProps) => {
  const { graph } = useAppGraph();
  const menuActions = useMenuBuilder(
    (get) => {
      const builder = MenuBuilder.make().separator('gap');
      if (attendableId) {
        builder.subgraph(graphActions(graph, get, attendableId, { filter: isToolbarAction }));
      }
      return builder.build();
    },
    [graph, attendableId],
  );

  return (
    <Next.Panel.Root>
      <Next.Panel.Header>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Next.Panel.Header>
      <Next.Panel.Body classNames='bg-scrim-surface'>
        <Next.Empty classNames='h-full'>{label}</Next.Empty>
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

EmptyPanel.displayName = 'EmptyPanel';
