//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Panel } from '@dxos/react-ui';
import { Empty } from '@dxos/react-ui-list';
import { ActionToolbar, MenuBuilder, graphActions, isToolbarAction, useMenuBuilder } from '@dxos/react-ui-menu';

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
    <Panel.Root>
      <Panel.Toolbar asChild>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Panel.Toolbar>
      <Panel.Content classNames='bg-scrim-surface'>
        <Empty classNames='h-full' label={label} />
      </Panel.Content>
    </Panel.Root>
  );
};

EmptyPanel.displayName = 'EmptyPanel';
