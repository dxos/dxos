//
// Copyright 2024 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React, { useMemo } from 'react';

import { type ScriptType } from '@dxos/functions';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { ElevationProvider, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import {
  type ActionGraphProps,
  MenuProvider,
  ToolbarMenu,
  createGapSeparator,
  rxFromSignal,
  useMenuActions,
} from '@dxos/react-ui-menu';

import {
  type CreateDeployOptions,
  type ScriptToolbarState,
  createDeploy,
  createFormat,
  createTemplateSelect,
  useDeployDeps,
} from '../../hooks';
import { meta } from '../../meta';

const createToolbarActions = ({ state, script, ...options }: CreateDeployOptions): Rx.Rx<ActionGraphProps> =>
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
  const { t } = useTranslation(meta.id);
  const options = useDeployDeps({ script });
  const toolbarCreator = useMemo(
    () => createToolbarActions({ state, script, t, ...options }),
    [state, script, options, t],
  );
  const menu = useMenuActions(toolbarCreator);

  return (
    <ElevationProvider elevation={role === 'section' ? 'positioned' : 'base'}>
      <MenuProvider {...menu} attendableId={fullyQualifiedId(script)}>
        <ToolbarMenu classNames={classNames} />
      </MenuProvider>
    </ElevationProvider>
  );
};
