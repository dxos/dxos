//
// Copyright 2026 DXOS.org
//

import { ActionGraphProps, createMenuAction, createMenuItemGroup } from '@dxos/react-ui-menu';

import { meta } from '../../meta';
import { SpacetimeToolbarState } from './SpacetimeToolbar';

export type SpacetimeTool = 'select' | 'move' | 'extrude';

const tools: Record<SpacetimeTool, string> = {
  select: 'ph--cursor--regular',
  move: 'ph--arrows-out-cardinal--regular',
  extrude: 'ph--arrow-line-up--regular',
};

/** Creates the tool selection toggle group action subgraph. */
export const createToolActions = (
  state: SpacetimeToolbarState,
  onToolChange: (tool: SpacetimeTool) => void,
): ActionGraphProps => {
  const toolGroupAction = createMenuItemGroup('tool', {
    iconOnly: true,
    label: ['tool.label', { ns: meta.id }],
    variant: 'toggleGroup',
    selectCardinality: 'single',
    value: state.tool,
  });

  const toolActions = Object.entries(tools).map(([tool, icon]) => {
    const checked = state.tool === tool;
    return createMenuAction(tool, () => onToolChange(tool as SpacetimeTool), {
      label: [`tool.${tool}.label`, { ns: meta.id }],
      checked,
      icon,
    });
  });

  return {
    nodes: [toolGroupAction, ...toolActions],
    edges: [
      { source: 'root', target: 'tool', relation: 'child' },
      ...toolActions.map(({ id }) => ({ source: toolGroupAction.id, target: id, relation: 'child' })),
    ],
  };
};
