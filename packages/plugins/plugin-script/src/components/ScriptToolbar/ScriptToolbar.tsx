//
// Copyright 2024 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React, { useMemo } from 'react';

import { type ScriptType } from '@dxos/functions';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { ElevationProvider, useTranslation } from '@dxos/react-ui';
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

export type ScriptToolbarProps = {
  role?: string;
  script: ScriptType;
  state: ScriptToolbarState;
};

export const ScriptToolbar = ({ script, role, state }: ScriptToolbarProps) => {
  const { t } = useTranslation(meta.id);
  const options = useDeployDeps({ script });
  const menu = useMemo(() => createToolbarActions({ state, script, t, ...options }), [state, script, options, t]);
  const actions = useMenuActions(menu);

  return (
    <ElevationProvider elevation={role === 'section' ? 'positioned' : 'base'}>
      <MenuProvider {...actions} attendableId={fullyQualifiedId(script)}>
        <ToolbarMenu />
      </MenuProvider>
    </ElevationProvider>
  );
};

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
