//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { type ScriptType } from '@dxos/functions';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { ElevationProvider, type ThemedClassName } from '@dxos/react-ui';
import { stackItemContentToolbarClassNames } from '@dxos/react-ui-editor';
import { createGapSeparator, MenuProvider, ToolbarMenu, useMenuActions } from '@dxos/react-ui-menu';

import { createDeploy } from './deploy';
import { createFormat } from './format';
import { createTemplateSelect } from './templateSelect';
import { useToolbarAction } from './useToolbarAction';
import { type ScriptToolbarState } from './useToolbarState';
import { createView } from './view';

export type ScriptToolbarProps = ThemedClassName<{
  role?: string;
  script: ScriptType;
  state: ScriptToolbarState;
}>;

const createToolbar = (state: ScriptToolbarState) => {
  const templateSelect = createTemplateSelect();
  const format = createFormat();
  const gap = createGapSeparator();
  const deploy = createDeploy(state);
  const view = createView(state);
  return {
    nodes: [...templateSelect.nodes, ...format.nodes, ...gap.nodes, ...deploy.nodes, ...view.nodes],
    edges: [...templateSelect.edges, ...format.edges, ...gap.edges, ...deploy.edges, ...view.edges],
  };
};

export const ScriptToolbar = ({ script, role, state, classNames }: ScriptToolbarProps) => {
  const handleAction = useToolbarAction({ state, script });
  const toolbarCreator = useCallback(() => createToolbar(state), [state]);
  const menu = useMenuActions(toolbarCreator);
  return (
    <div role='none' className={stackItemContentToolbarClassNames(role)}>
      <ElevationProvider elevation={role === 'section' ? 'positioned' : 'base'}>
        <MenuProvider {...menu} onAction={handleAction} attendableId={fullyQualifiedId(script)}>
          <ToolbarMenu classNames={classNames} />
        </MenuProvider>
      </ElevationProvider>
    </div>
  );
};
