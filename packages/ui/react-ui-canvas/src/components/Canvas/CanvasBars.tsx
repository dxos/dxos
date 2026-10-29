//
// Copyright 2026 DXOS.org
//

//
// Root view of the scene engine (§6-§8): owns the camera, the scene path, selection and the pointer
// state machine; renders the current scene through `SceneLayer` under one CSS transform and drills
// in and out of portals with a camera transition then a root swap. Every model change goes through
// the projection as an intent; the view never writes coordinates itself (decision 11).
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { keyTimes, timelineFps } from '../../model/index.ts';
import { NOMINAL_ZOOM } from '../../utils/index.ts';
import { DisplayPanel, TimelinePanel, ToolsPanel } from '../panels/index.ts';
import {
  ActionToolbar,
  type CameraActions,
  CameraToolbar,
  type EditActions,
  type NavigationActions,
  NavigationToolbar,
} from '../Toolbar/index.ts';
import {
  useCanvasDocument,
  useCanvasEditing,
  useCanvasLook,
  useCanvasNavigation,
  useCanvasSelection,
  useCanvasServices,
  useCanvasTime,
  useCanvasTools,
} from './CanvasContext.ts';
import { OBJECTS_CRUMB, ZOOM_STEP } from './constants.ts';

//
// Toolbars
//

export type CanvasBarProps = Util.ThemedClassName<{}>;

/**
 * The frame a bar floats in: its content's width, but half the view at most (the bar scrolls beyond that).
 * The toolbar's own scroll frame is zero-height in flow, so `classNames` positions this frame, not the bar.
 */
const barFrame = 'absolute w-max max-w-[50%]';

/** Where the view is in the scene tree. */
export const CanvasNavigation = ({ classNames = 'top-2 left-2' }: CanvasBarProps) => {
  const { atoms, commands } = useCanvasNavigation('Canvas.Navigation');
  const { store } = useCanvasDocument('Canvas.Navigation');
  const path = useAtomValue(atoms.path);
  const isolation = useAtomValue(atoms.isolation);
  const scenes = useAtomValue(store.views);
  const actions = useMemo<NavigationActions>(
    () => ({
      // In isolation the crumbs read `Objects > <name>`, and the first leads back out.
      path: isolation ? [OBJECTS_CRUMB, isolation.composite] : path,
      nameOf: (id) => (id === OBJECTS_CRUMB ? 'Objects' : (scenes[id]?.name ?? id)),
      onPath: commands.openPath,
    }),
    [isolation, path, scenes, commands],
  );
  return (
    <div className={mx(barFrame, classNames)}>
      <NavigationToolbar actions={actions} />
    </div>
  );
};

CanvasNavigation.displayName = 'Canvas.Navigation';

/** Everything that changes the view or the scene. */
export const CanvasActions = ({ classNames = 'bottom-2 left-1/2 -translate-x-1/2' }: CanvasBarProps) => {
  const { projection, nodeRegistry, capabilities, readonly, document } = useCanvasDocument('Canvas.Actions');
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

/** The camera's controls and numbers; nothing here changes the scene. */
export const CanvasDebug = ({ classNames = 'bottom-2 left-2' }: CanvasBarProps) => {
  const { atoms, commands } = useCanvasNavigation('Canvas.Debug');
  const camera = useAtomValue(atoms.camera);
  const fitting = useAtomValue(atoms.fitting);
  const actions = useMemo<CameraActions>(
    () => ({
      fit: commands.fit,
      fitting,
      zoomReset: () => commands.zoomTo(NOMINAL_ZOOM),
      zoomIn: () => commands.zoomBy(ZOOM_STEP),
      zoomOut: () => commands.zoomBy(1 / ZOOM_STEP),
    }),
    [commands, fitting],
  );
  return (
    <div className={mx(barFrame, classNames)}>
      <CameraToolbar actions={actions}>{Math.round(camera.zoom * 100)}%</CameraToolbar>
    </div>
  );
};

CanvasDebug.displayName = 'Canvas.Debug';

//
// Theme
//

/** The theme picker and the grid over its background, at the bottom right. */
export const CanvasTheme = ({ classNames = 'bottom-2 right-2' }: CanvasBarProps) => {
  const { look, themes, themeOverride, themeGrid, setTheme, setBackgroundGrid } = useCanvasLook('Canvas.Theme');
  const { atoms, commands } = useCanvasTools('Canvas.Theme');
  const { projection, readonly } = useCanvasDocument('Canvas.Theme');
  const guides = useAtomValue(atoms.guides);
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
        onGuidesToggle={projection.lattice ? commands.toggleGuides : undefined}
        // Snap applies to edits, so a read-only canvas offers none.
        snap={snap}
        onSnapToggle={readonly ? undefined : commands.toggleSnap}
        lattice={projection.lattice !== undefined}
      />
    </div>
  );
};

CanvasTheme.displayName = 'Canvas.Theme';

//
// Tools
//

/** The tool rail: what the next gesture will draw. */
export const CanvasTools = ({ classNames = 'absolute top-14 bottom-14 left-2' }: CanvasBarProps) => {
  const { nodeRegistry, linkRegistry, capabilities, readonly } = useCanvasDocument('Canvas.Tools');
  const { onReadonlyChange } = useCanvasServices('Canvas.Tools');
  const { atoms, commands } = useCanvasTools('Canvas.Tools');
  const tool = useAtomValue(atoms.tool);
  return (
    // Spans the room the rail may take, so it can fold its groups to fit; the canvas below the rail keeps the pointer.
    <div className={mx('pointer-events-none', classNames)}>
      <ToolsPanel
        tool={tool}
        nodes={nodeRegistry}
        links={linkRegistry}
        capabilities={capabilities}
        readonly={readonly}
        onReadonlyChange={onReadonlyChange}
        onToolChange={commands.setTool}
      />
    </div>
  );
};

CanvasTools.displayName = 'Canvas.Tools';

//
// Timeline
//

export type CanvasTimelineProps = CanvasBarProps;

/**
 * The collapsed timeline bar (ANIMATION.md §5.8), over the bottom of the canvas: shown while the scene has a timeline
 * (the Objects panel's Animate action gives it one).
 */
export const CanvasTimeline = ({ classNames = 'bottom-14 left-1/2 -translate-x-1/2' }: CanvasTimelineProps) => {
  const { readonly, capabilities } = useCanvasDocument('Canvas.Timeline');
  const { atoms, commands, timeline: timelineAtom } = useCanvasTime('Canvas.Timeline');
  const selectionAspect = useCanvasSelection('Canvas.Timeline');
  const timeline = useAtomValue(timelineAtom);
  const time = useAtomValue(atoms.time);
  const playing = useAtomValue(atoms.playing);
  const autoKey = useAtomValue(atoms.autoKey);
  const selection = useAtomValue(selectionAspect.atoms.selection);
  const keys = useMemo(() => keyTimes(timeline, selection), [timeline, selection]);
  if (!timeline) {
    return null;
  }
  return (
    <div className={mx(barFrame, 'max-w-[calc(100%-2rem)]', classNames)}>
      <TimelinePanel
        time={time}
        duration={timeline.duration}
        playing={playing}
        fps={timelineFps(timeline)}
        keys={keys}
        autoKey={autoKey}
        readonly={readonly || !capabilities.update}
        onPlayingChange={commands.setPlaying}
        onTimeChange={commands.seek}
        onAutoKeyChange={commands.setAutoKey}
        onMoveKey={readonly || !capabilities.update ? undefined : commands.moveKey}
        onAddKey={selection.size > 0 ? commands.addKey : undefined}
        onRemoveKey={selection.size > 0 ? commands.removeKey : undefined}
      />
    </div>
  );
};

CanvasTimeline.displayName = 'Canvas.Timeline';
