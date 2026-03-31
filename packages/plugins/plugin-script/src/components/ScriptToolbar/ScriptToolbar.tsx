//
// Copyright 2024 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { type Script } from '@dxos/functions';
import { ElevationProvider, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/ui-theme';
import { type ActionGraphProps, Menu, MenuRootProps, createGapSeparator, useMenuActions } from '@dxos/react-ui-menu';

import {
  type CreateDeployOptions,
  type ScriptToolbarStateStore,
  createDeploy,
  createFormat,
  createTemplateSelect,
  useDeployDeps,
} from '../../hooks';
import { meta } from '../../meta';

export type ScriptToolbarProps = Pick<MenuRootProps, 'attendableId'> & {
  script: Script.Script;
  state: ScriptToolbarStateStore;
};

export const ScriptToolbar = composable<HTMLDivElement, ScriptToolbarProps>(
  ({ script, attendableId, role, state, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const options = useDeployDeps({ script });
    const menuCreator = useMemo(
      () => createToolbarActions({ state, script, t, ...options }),
      [state, script, options, t],
    );
    const menuActions = useMenuActions(menuCreator);

    return (
      <ElevationProvider elevation={role === 'section' ? 'positioned' : 'base'}>
        <Menu.Root {...menuActions} attendableId={attendableId}>
          <Menu.Toolbar {...composableProps(props)} ref={forwardedRef} />
        </Menu.Root>
      </ElevationProvider>
    );
  },
);

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
