//
// Copyright 2024 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import React, { useMemo } from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import type * as Script from '@dxos/compute/Script';
import {
  type ActionGraphProps,
  ActionToolbar,
  type ActionToolbarProps,
  createGapSeparator,
  useMenuActions,
} from '@dxos/react-ui-menu';
import * as ElevationProvider from '@dxos/react-ui/ElevationProvider';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Util from '@dxos/react-ui/Util';

import {
  type CreateDeployOptions,
  type ScriptToolbarStateStore,
  createDeploy,
  createFormat,
  createTemplateSelect,
  useDeployDeps,
} from '#hooks';
import { meta } from '#meta';

export type ScriptToolbarProps = Pick<ActionToolbarProps, 'attendableId'> & {
  script: Script.Script;
  state: ScriptToolbarStateStore;
};

export const ScriptToolbar = Util.composable<HTMLDivElement, ScriptToolbarProps>(
  ({ script, attendableId, role, state, ...props }, forwardedRef) => {
    const { t } = Hooks.useTranslation(meta.profile.key);
    const options = useDeployDeps({ script });
    const menuCreator = useMemo(
      () => createToolbarActions({ state, script, t, ...options }),
      [state, script, options, t],
    );
    const menuActions = useMenuActions(menuCreator);

    return (
      <ElevationProvider.Root elevation={role === AppSurface.Section.role ? 'positioned' : 'base'}>
        <ActionToolbar
          {...menuActions}
          attendableId={attendableId}
          {...Util.composableProps(props)}
          ref={forwardedRef}
        />
      </ElevationProvider.Root>
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
