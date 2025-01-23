//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type ScriptType } from '@dxos/functions';
import { ElevationProvider, type ThemedClassName } from '@dxos/react-ui';
import { stackItemContentToolbarClassNames } from '@dxos/react-ui-editor';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';

import { useToolbarAction } from './useToolbarAction';
import { type ScriptToolbarState } from './useToolbarState';

export type ScriptToolbarProps = ThemedClassName<{
  role?: string;
  script: ScriptType;
  state: ScriptToolbarState;
}>;

export const ScriptToolbar = ({ script, role, state, classNames }: ScriptToolbarProps) => {
  const handleAction = useToolbarAction({ state, script });

  return (
    <div role='none' className={stackItemContentToolbarClassNames(role)}>
      <ElevationProvider elevation={role === 'section' ? 'positioned' : 'base'}>
        <MenuProvider onAction={handleAction}>
          <ToolbarMenu classNames={classNames} />
        </MenuProvider>
      </ElevationProvider>
    </div>
  );
};
