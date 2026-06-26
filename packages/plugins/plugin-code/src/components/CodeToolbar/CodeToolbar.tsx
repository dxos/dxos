//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { ElevationProvider } from '@dxos/react-ui';
import { type ActionGraphProps, Menu, type MenuRootProps, createMenuAction, useMenuActions } from '@dxos/react-ui-menu';

import { meta } from '#meta';
import { type CodeCapabilities } from '#types';

export type CodeToolbarProps = Pick<MenuRootProps, 'attendableId'> & {
  state: CodeCapabilities.ProjectBuildState | undefined;
  onBuild: () => void;
  onRun: () => void;
  role?: string;
};

/**
 * Toolbar for `CodeArticle`. Wraps a `Menu.Toolbar` with two actions —
 * Build and Run — built through the standard `useMenuActions` /
 * `createMenuAction` idiom so the article's attendable identity threads
 * through `Menu.Root` (and so the actions show up uniformly with other
 * toolbar-driven articles in the deck).
 */
export const CodeToolbar = ({ attendableId, role, state, onBuild, onRun }: CodeToolbarProps) => {
  const buildBusy = state?.busy === 'build';
  const runBusy = state?.busy === 'run';
  // Either operation in flight disables both actions so the user can't race
  // Build and Run against each other while the BuildRun atom updates.
  const anyBusy = state?.busy !== undefined;
  const canRun = state?.lastBuild?.ok === true;

  const menuCreator = useMemo(
    () => createToolbarActions({ buildBusy, runBusy, anyBusy, canRun, onBuild, onRun }),
    [buildBusy, runBusy, anyBusy, canRun, onBuild, onRun],
  );
  const menuActions = useMenuActions(menuCreator);

  return (
    <ElevationProvider elevation={role === AppSurface.Section.role ? 'positioned' : 'base'}>
      <Menu.Root {...menuActions} attendableId={attendableId}>
        <Menu.Toolbar />
      </Menu.Root>
    </ElevationProvider>
  );
};

type CreateOptions = {
  buildBusy: boolean;
  runBusy: boolean;
  anyBusy: boolean;
  canRun: boolean;
  onBuild: () => void;
  onRun: () => void;
};

const createToolbarActions = ({
  buildBusy,
  runBusy,
  anyBusy,
  canRun,
  onBuild,
  onRun,
}: CreateOptions): Atom.Atom<ActionGraphProps> =>
  Atom.make(() => ({
    nodes: [
      createMenuAction('build', onBuild, {
        label: [buildBusy ? 'action.build.busy.label' : 'action.build.label', { ns: meta.profile.key }],
        icon: 'ph--hammer--regular',
        disabled: anyBusy,
        testId: 'code-toolbar.build',
      }),
      createMenuAction('run', onRun, {
        label: [runBusy ? 'action.run.busy.label' : 'action.run.label', { ns: meta.profile.key }],
        icon: 'ph--play--regular',
        disabled: anyBusy || !canRun,
        testId: 'code-toolbar.run',
      }),
    ],
    edges: [
      { source: 'root', target: 'build', relation: 'child' },
      { source: 'root', target: 'run', relation: 'child' },
    ],
  }));
