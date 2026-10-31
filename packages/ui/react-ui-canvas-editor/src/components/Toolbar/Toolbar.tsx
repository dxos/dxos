//
// Copyright 2026 DXOS.org
//

//
// The optional editor toolbars (decision 5): every button is an action the view exposes, so a host may
// render these bars, its own, or none; the palette stays a separate component. They are separate bars so
// where a control sits says what it does: `NavigationToolbar` says where the view is in the scene tree,
// `ActionToolbar` changes the scene, and `CameraToolbar` fits and zooms the view beside its own numbers.
//

import React, { type ReactNode } from 'react';

import { FLOATING_BAR, shortcutFor } from '@dxos/react-ui-canvas';
import * as Button from '@dxos/react-ui/Button';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
import { type ViewId } from '@dxos/scene';
import { mx } from '@dxos/ui-theme';

import { Breadcrumbs } from '../Breadcrumbs/index.ts';

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

// A bar fills the frame its host floats it in and scrolls what does not fit; the toolbar's own layout
// supplies `overflow-x-auto scrollbar-none`, leaving no bar over the diagram.
const barClasses = mx('w-full', FLOATING_BAR);

const readoutClasses = 'text-fg-muted font-mono text-sm whitespace-nowrap';

export type NavigationToolbarProps = Util.ThemedClassName<{
  actions: NavigationActions;
  /** Trailing status, e.g. the depth readout. */
  children?: ReactNode;
}>;

/** Where the view is: the drilled path and the readout that follows it. */
export const NavigationToolbar = ({ classNames, actions, children }: NavigationToolbarProps) => {
  const { path } = actions;
  return (
    <Toolbar.Root size='sm' classNames={mx(barClasses, classNames)} data-testid='canvas-toolbar'>
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--arrow-up--regular'
        label='Up'
        disabled={path.length < 2}
        data-testid='toolbar-up'
        onClick={() => actions.onPath(path.length - 2)}
      />
      <Breadcrumbs path={path} nameOf={actions.nameOf} onSelect={actions.onPath} />
      {children && (
        <>
          <Toolbar.Separator variant='line' />
          <Toolbar.Text classNames={readoutClasses}>{children}</Toolbar.Text>
        </>
      )}
    </Toolbar.Root>
  );
};

export type CameraToolbarProps = Util.ThemedClassName<{ actions: CameraActions; children?: ReactNode }>;

/** The camera: fit and zoom, beside its own numbers; nothing here changes the scene. */
export const CameraToolbar = ({ classNames, actions, children }: CameraToolbarProps) => {
  return (
    <Toolbar.Root classNames={mx(barClasses, classNames)} data-testid='canvas-debug'>
      <Button.Toggle
        variant='ghost'
        iconOnly
        icon='ph--arrows-out--regular'
        label={`Fit (${shortcutFor('fit')}): keep the scene framed until you pan or zoom`}
        pressed={actions.fitting}
        data-testid='toolbar-fit'
        onPressedChange={actions.fit}
      />
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--number-square-one--regular'
        label={`Actual size (${shortcutFor('zoomReset')})`}
        data-testid='toolbar-zoom-reset'
        onClick={actions.zoomReset}
      />
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--magnifying-glass-plus--regular'
        label='Zoom in'
        data-testid='toolbar-zoom-in'
        onClick={actions.zoomIn}
      />
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--magnifying-glass-minus--regular'
        label='Zoom out'
        data-testid='toolbar-zoom-out'
        onClick={actions.zoomOut}
      />
      <Toolbar.Separator variant='line' />
      <Toolbar.Text classNames={readoutClasses}>{children}</Toolbar.Text>
    </Toolbar.Root>
  );
};
