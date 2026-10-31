//
// Copyright 2026 DXOS.org
//

//
// The 2D engine's own display panel, which `CanvasEditor` shows where the shared editor's does not model it yet (grid
// kinds, the theme's own grid and the lattice).
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React from 'react';

import { useCanvasDocument, useCanvasLook, useCanvasTools } from '@dxos/react-ui-canvas';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { DisplayPanel } from '../panels/index.ts';

//
// Toolbars
//

export type CanvasBarProps = Util.ThemedClassName<{}>;

/**
 * The frame a bar floats in: its content's width, but half the view at most (the bar scrolls beyond that).
 * The toolbar's own scroll frame is zero-height in flow, so `classNames` positions this frame, not the bar.
 */
const barFrame = 'absolute w-max max-w-[50%]';

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
