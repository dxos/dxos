//
// Copyright 2026 DXOS.org
//

//
// The optional editor toolbars (decision 5): every button is an action the view exposes, so a host may
// render these bars, its own, or none; the palette stays a separate component. They are separate bars so
// where a control sits says what it does: `NavigationToolbar` says where the view is in the scene tree,
// the actions bar changes the scene, and `CameraToolbar` fits and zooms the view beside its own numbers.
//

import React, { type ReactNode } from 'react';

import { shortcutFor } from '@dxos/react-ui-canvas';
import { type ActionGraphProps, ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
import { type ViewId } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import { Breadcrumbs } from '../Breadcrumbs/index.ts';
import { menuBarClasses } from './bar.ts';

/** What the toolbars can ask of the view; a missing action hides or disables its control. */
export type ToolbarActions = {
  /** Navigation: the scene path, a name per scene, and drill-out by path index. */
  path: ViewId[];
  nameOf: (id: ViewId) => string;
  onPath: (index: number) => void;
  /** Frames the scene and keeps it framed (fit mode) until the user pans or zooms. */
  fit: () => void;
  /** The view is in fit mode. */
  fitting?: boolean;
  /** Back to true size (100%), about the view's centre. */
  zoomReset: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
};

/** What each bar reads, so a host builds only its bar's slice and the bar re-renders for that alone. */
export type NavigationActions = Pick<ToolbarActions, 'path' | 'nameOf' | 'onPath'>;
export type CameraActions = Pick<ToolbarActions, 'fit' | 'fitting' | 'zoomReset' | 'zoomIn' | 'zoomOut'>;

// Never truncated: the bar collapses its buttons first.
const readoutClasses = 'flex-none text-fg-muted font-mono text-sm whitespace-nowrap';

export type NavigationToolbarProps = Util.ThemedClassName<{
  actions: NavigationActions;
  /** Trailing status, e.g. the depth readout. */
  children?: ReactNode;
}>;

/** Where the view is: the drilled path and the readout that follows it; only Up collapses. */
export const NavigationToolbar = ({ classNames, actions, children }: NavigationToolbarProps) => {
  const menu = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'up',
          {
            label: 'Up',
            icon: 'ph--arrow-up--regular',
            disabled: actions.path.length < 2,
            testId: 'toolbar-up',
            placement: { collapse: 1 },
          },
          () => actions.onPath(actions.path.length - 2),
        )
        .custom('path', { label: 'Path' }, () => (
          <Breadcrumbs path={actions.path} nameOf={actions.nameOf} onSelect={actions.onPath} />
        ))
        .subgraph(
          children
            ? (builder) =>
                builder
                  .separator('line')
                  .custom('readout', { label: 'Readout' }, () => (
                    <Toolbar.Text classNames={readoutClasses}>{children}</Toolbar.Text>
                  ))
            : undefined,
        )
        .build(),
    [actions, children],
  );
  return (
    <ActionToolbar
      {...menu}
      alwaysActive
      size='sm'
      classNames={mx(menuBarClasses, classNames)}
      data-testid='canvas-toolbar'
    />
  );
};

export type CameraToolbarProps = Util.ThemedClassName<{ actions: CameraActions; children?: ReactNode }>;

/**
 * The camera's items: fit and zoom, beside its own numbers (the readout, `canvas-debug`); nothing here changes the
 * scene. Zooming collapses first, Fit last.
 */
export const cameraItems = (actions: CameraActions, readout: ReactNode): ActionGraphProps =>
  MenuBuilder.make()
    .action(
      'fit',
      {
        label: `Fit (${shortcutFor('fit')}): keep the scene framed until you pan or zoom`,
        icon: 'ph--arrows-out--regular',
        variant: 'toggle',
        checked: actions.fitting === true,
        testId: 'toolbar-fit',
        placement: { collapse: 1 },
      },
      actions.fit,
    )
    .action(
      'zoom-reset',
      {
        label: `Actual size (${shortcutFor('zoomReset')})`,
        icon: 'ph--number-square-one--regular',
        testId: 'toolbar-zoom-reset',
        placement: { collapse: 2 },
      },
      actions.zoomReset,
    )
    .action(
      'zoom-in',
      {
        label: 'Zoom in',
        icon: 'ph--magnifying-glass-plus--regular',
        testId: 'toolbar-zoom-in',
        placement: { collapse: 3 },
      },
      actions.zoomIn,
    )
    .action(
      'zoom-out',
      {
        label: 'Zoom out',
        icon: 'ph--magnifying-glass-minus--regular',
        testId: 'toolbar-zoom-out',
        placement: { collapse: 3 },
      },
      actions.zoomOut,
    )
    .separator('line')
    .custom('readout', { label: 'Zoom' }, () => (
      <Toolbar.Text classNames={readoutClasses} data-testid='canvas-debug'>
        {readout}
      </Toolbar.Text>
    ))
    .build();

/** The camera's items as a bar of their own. */
export const CameraToolbar = ({ classNames, actions, children }: CameraToolbarProps) => {
  const menu = useMenuBuilder(() => cameraItems(actions, children), [actions, children]);
  return <ActionToolbar {...menu} alwaysActive classNames={mx(menuBarClasses, classNames)} />;
};
