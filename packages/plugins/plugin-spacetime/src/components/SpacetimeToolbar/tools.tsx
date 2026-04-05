//
// Copyright 2026 DXOS.org
//

import { type ActionGroupBuilderFn, type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';

import { meta } from '../../meta';

export type SpacetimeTool = 'select' | 'move' | 'extrude';

export type ToolState = {
  tool: SpacetimeTool;
};

const tools: Record<SpacetimeTool, string> = {
  select: 'ph--cursor--regular',
  move: 'ph--arrows-out-cardinal--regular',
  extrude: 'ph--arrow-line-up--regular',
};

/** Creates the tool selection toggle group. */
export const createToolActions =
  (state: ToolState, onToolChange: (next: Partial<ToolState>) => void): ActionGroupBuilderFn =>
  (builder) => {
    builder.group(
      'tool',
      {
        label: ['tool.label', { ns: meta.id }],
        iconOnly: true,
        variant: 'toggleGroup',
        selectCardinality: 'single',
        value: state.tool,
      } as ToolbarMenuActionGroupProperties,
      (group) => {
        for (const [tool, icon] of Object.entries(tools)) {
          group.action(
            tool,
            { label: [`tool.${tool}.label`, { ns: meta.id }], checked: state.tool === tool, icon },
            () => onToolChange({ tool: tool as SpacetimeTool }),
          );
        }
      },
    );
  };
