//
// Copyright 2024 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React, { useMemo } from 'react';

import { type ScriptType } from '@dxos/functions';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { ElevationProvider, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { stackItemContentToolbarClassNames } from '@dxos/react-ui-editor';
import { createGapSeparator, MenuProvider, rxFromSignal, ToolbarMenu, useMenuActions } from '@dxos/react-ui-menu';

import {
  type CreateDeployOptions,
  type ScriptToolbarState,
  createDeploy,
  createFormat,
  createTemplateSelect,
  useDeployDeps,
} from '../../hooks';
import { SCRIPT_PLUGIN } from '../../meta';

const createToolbar = ({ state, script, ...options }: CreateDeployOptions) =>
  Rx.make((get) =>
    get(
      rxFromSignal(() => {
        const templateSelect = createTemplateSelect(script);
        const format = createFormat(script);
        const gap = createGapSeparator();
        const deploy = createDeploy({ state, script, ...options });
        return {
          nodes: [...templateSelect.nodes, ...format.nodes, ...gap.nodes, ...deploy.nodes],
          edges: [...templateSelect.edges, ...format.edges, ...gap.edges, ...deploy.edges],
        };
      }),
    ),
  );

export type ScriptToolbarProps = ThemedClassName<{
  role?: string;
  script: ScriptType;
  state: ScriptToolbarState;
}>;

export const ScriptToolbar = ({ script, role, state, classNames }: ScriptToolbarProps) => {
  const { t } = useTranslation(SCRIPT_PLUGIN);
  const options = useDeployDeps({ script });
  const toolbarCreator = useMemo(() => createToolbar({ state, script, t, ...options }), [state, script, options, t]);
  const menu = useMenuActions(toolbarCreator);

  return (
    <div role='none' className={stackItemContentToolbarClassNames(role)}>
      <ElevationProvider elevation={role === 'section' ? 'positioned' : 'base'}>
        <MenuProvider {...menu} attendableId={fullyQualifiedId(script)}>
          <ToolbarMenu classNames={classNames} />
        </MenuProvider>
      </ElevationProvider>
    </div>
  );
};
