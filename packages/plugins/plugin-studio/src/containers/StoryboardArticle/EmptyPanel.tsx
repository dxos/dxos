//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/app-toolkit/Hooks';
import { ActionToolbar, MenuBuilder, graphActions, isToolbarAction, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';

export type EmptyPanelProps = {
  label: string;
  attendableId?: string;
};

/**
 * The storyboard's main panel with nothing to show: a message, and the storyboard node's toolbar
 * actions (Play) all the same.
 */
export const EmptyPanel = ({ label, attendableId }: EmptyPanelProps) => {
  const { graph } = Hooks.useAppGraph();
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
      <Panel.Header>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Panel.Header>
      <Panel.Body classNames='bg-scrim-surface'>
        <Status.Empty classNames='h-full'>{label}</Status.Empty>
      </Panel.Body>
    </Panel.Root>
  );
};

EmptyPanel.displayName = 'EmptyPanel';
