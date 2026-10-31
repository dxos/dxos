//
// Copyright 2026 DXOS.org
//

//
// The 2D engine's own action bar and display panel, which `CanvasEditor` shows where the shared editor's parts do not
// model them yet (the create menu, layout and debug; grid kinds, the theme's own grid and the lattice).
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import {
  useCanvasDocument,
  useCanvasEditing,
  useCanvasLook,
  useCanvasSelection,
  useCanvasTools,
} from '@dxos/react-ui-canvas';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { DisplayPanel } from '../panels/index.ts';
import { ActionToolbar, type EditActions } from '../Toolbar/index.ts';

//
// Toolbars
//

export type CanvasBarProps = Util.ThemedClassName<{}>;

/**
 * The frame a bar floats in: its content's width, but half the view at most (the bar scrolls beyond that).
 * The toolbar's own scroll frame is zero-height in flow, so `classNames` positions this frame, not the bar.
 */
const barFrame = 'absolute w-max max-w-[50%]';

/** Everything that changes the view or the scene. */
export const CanvasActions = ({ classNames = 'bottom-2 left-1/2 -translate-x-1/2' }: CanvasBarProps) => {
  const { draw, nodeRegistry, capabilities, readonly, document } = useCanvasDocument('Canvas.Actions');
  const tools = useCanvasTools('Canvas.Actions');
  const selection = useCanvasSelection('Canvas.Actions');
  const editing = useCanvasEditing('Canvas.Actions');
  const debug = useAtomValue(tools.atoms.debug);
  const history = useAtomValue(document.history);
  const hasSelection = useAtomValue(selection.atoms.selection).size > 0;
  const hasClipboard = useAtomValue(editing.atoms.clipboard) !== undefined;
  const canUndo = !readonly && history.canUndo;
  const canRedo = !readonly && history.canRedo;
  const actions = useMemo<EditActions>(
    () => ({
      debug,
      toggleDebug: tools.commands.toggleDebug,
      canUndo,
      canRedo,
      undo: document.undo,
      redo: document.redo,
      hasSelection,
      hasClipboard,
      cut: editing.commands.cut,
      copy: editing.commands.copy,
      paste: () => editing.commands.paste(),
      delete: selection.commands.delete,
      create: document.create,
      layout: capabilities.layout ? document.layout : undefined,
    }),
    [
      debug,
      canUndo,
      canRedo,
      hasSelection,
      hasClipboard,
      capabilities.layout,
      tools.commands,
      editing.commands,
      selection.commands,
      document,
    ],
  );
  // Every action here edits the scene.
  if (readonly) {
    return null;
  }
  return (
    // Its natural width, never scrolled: the actions are few and fixed, and a scrolled bar hides its last ones. On a
    // canvas too narrow for it between the corner bars it goes, as its commands all have keys and a context menu.
    <div className={mx(barFrame, 'max-w-none hidden @min-[56rem]/canvas:block', classNames)}>
      <ActionToolbar actions={actions} nodes={nodeRegistry} capabilities={capabilities} />
    </div>
  );
};

CanvasActions.displayName = 'Canvas.Actions';

//
// Display
//

/** The display panel, at the bottom right: snapping, guides, axes, the grid over the background and the theme. */
export const CanvasDisplay = ({ classNames = 'bottom-2 right-2' }: CanvasBarProps) => {
  const { look, themes, themeOverride, themeGrid, setTheme, setBackgroundGrid } = useCanvasLook('Canvas.Display');
  const { atoms, commands } = useCanvasTools('Canvas.Display');
  const { draw, readonly } = useCanvasDocument('Canvas.Display');
  const guides = useAtomValue(atoms.guides);
  const axes = useAtomValue(atoms.axes);
  const snap = useAtomValue(atoms.snap);
  return (
    <div className={mx(barFrame, classNames)}>
      <DisplayPanel
        registry={themes}
        theme={look.theme}
        override={themeOverride}
        grid={look.background.grid}
        themeGrid={themeGrid}
        onThemeChange={setTheme}
        onGridChange={setBackgroundGrid}
        guides={guides}
        // The guides are the lattice's cells, so only a lattice scene has any to show.
        onGuidesToggle={draw.lattice ? commands.toggleGuides : undefined}
        axes={axes}
        onAxesToggle={commands.toggleAxes}
        // Snap applies to edits, so a read-only canvas offers none.
        snap={snap}
        onSnapToggle={readonly ? undefined : commands.toggleSnap}
        lattice={draw.lattice !== undefined}
      />
    </div>
  );
};

CanvasDisplay.displayName = 'Canvas.Display';
