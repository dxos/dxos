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
  Menu,
  type MenuRootProps,
  createGapSeparator,
  useMenuActions,
} from '@dxos/react-ui-menu';

import {
  type CreateDeployOptions,
  type ScriptToolbarStateStore,
  createDeploy,
  createFormat,
  createTemplateSelect,
  useDeployDeps,
} from '../../hooks';
import { meta } from '../../meta';

export type ScriptToolbarProps = Partial<MenuRootProps> & {
  role?: string;
  script: Script.Script;
  state: ScriptToolbarStateStore;
};

export const ScriptToolbar = ({ script, role, state, ...props }: ScriptToolbarProps) => {
  const { t } = useTranslation(meta.id);
  const options = useDeployDeps({ script });
  const menuCreator = useMemo(
    () => createToolbarActions({ state, script, t, ...options }),
    [state, script, options, t],
  );
  const menuActions = useMenuActions(menuCreator);

  return (
    <ElevationProvider elevation={role === 'section' ? 'positioned' : 'base'}>
      <Menu.Root {...menuActions} attendableId={Obj.getDXN(script).toString()}>
        <Menu.Toolbar {...props} />
      </Menu.Root>
    </ElevationProvider>
  );
};

const createToolbarActions = ({ state, script, ...options }: CreateDeployOptions): Atom.Atom<ActionGraphProps> =>
  Atom.make((get) => {
    // Subscribe to state changes.
    get(state.atom);
    const templateSelect = createTemplateSelect(script);
    const format = createFormat(script);
    const gap = createGapSeparator();
    const deploy = createDeploy({ state, script, ...options });
    return {
      nodes: [...templateSelect.nodes, ...format.nodes, ...gap.nodes, ...deploy.nodes],
      edges: [...templateSelect.edges, ...format.edges, ...gap.edges, ...deploy.edges],
    };
  });
