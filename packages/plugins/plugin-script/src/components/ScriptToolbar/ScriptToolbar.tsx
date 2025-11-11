//
// Copyright 2024 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { type Script } from '@dxos/functions';
import { ElevationProvider, useTranslation } from '@dxos/react-ui';
import {
  type ActionGraphProps,
  MenuProvider,
  ToolbarMenu,
  atomFromSignal,
  createGapSeparator,
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
  script: Script.Script;
  state: ScriptToolbarState;
};

export const ScriptToolbar = ({ script, role, state }: ScriptToolbarProps) => {
  const { t } = useTranslation(meta.id);
  const options = useDeployDeps({ script });
  const menu = useMemo(() => createToolbarActions({ state, script, t, ...options }), [state, script, options, t]);
  const actions = useMenuActions(menu);

  return (
    <ElevationProvider elevation={role === 'section' ? 'positioned' : 'base'}>
      <MenuProvider {...actions} attendableId={Obj.getDXN(script).toString()}>
        <ToolbarMenu />
      </MenuProvider>
    </ElevationProvider>
  );
};

const createToolbarActions = ({ state, script, ...options }: CreateDeployOptions): Atom.Atom<ActionGraphProps> =>
  Atom.make((get) =>
    get(
      atomFromSignal(() => {
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
