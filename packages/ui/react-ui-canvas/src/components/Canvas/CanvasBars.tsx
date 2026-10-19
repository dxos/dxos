//
// Copyright 2026 DXOS.org
//

//
// Root view of the scene engine (§6–§8): owns the camera, the scene path, selection and the pointer
// state machine; renders the current scene through `SceneLayer` under one CSS transform and drills
// in and out of portals with a camera transition then a root swap. Every model change goes through
// the projection as an intent; the view never writes coordinates itself (decision 11).
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { keyTimes } from '../../model/index.ts';
import { ThemePanel, TimelinePanel, ToolsPanel } from '../panels/index.ts';
import { ActionToolbar, CameraToolbar, NavigationToolbar } from '../Toolbar/index.ts';
import { useCanvasContext } from './CanvasContext.ts';

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
  const { toolbarActions } = useCanvasContext('Canvas.Navigation');
  return (
    <div className={mx(barFrame, classNames)}>
      <NavigationToolbar actions={toolbarActions} />
    </div>
  );
};

CanvasNavigation.displayName = 'Canvas.Navigation';

/** Everything that changes the view or the scene. */
export const CanvasActions = ({ classNames = 'bottom-2 left-1/2 -translate-x-1/2' }: CanvasBarProps) => {
  const { toolbarActions, nodeRegistry, capabilities, readonly } = useCanvasContext('Canvas.Actions');
  // Every action here edits the scene or how edits snap.
  if (readonly) {
    return null;
  }
  return (
    // Its natural width, never scrolled: the actions are few and fixed, and a scrolled bar hides its last ones.
    <div className={mx(barFrame, 'max-w-none', classNames)}>
      <ActionToolbar actions={toolbarActions} nodes={nodeRegistry} capabilities={capabilities} />
    </div>
  );
};

CanvasActions.displayName = 'Canvas.Actions';

/** The camera's controls and numbers; nothing here changes the scene. */
export const CanvasDebug = ({ classNames = 'bottom-2 left-2' }: CanvasBarProps) => {
  const { toolbarActions, atoms } = useCanvasContext('Canvas.Debug');
  const camera = useAtomValue(atoms.camera);
  return (
    <div className={mx(barFrame, classNames)}>
      <CameraToolbar actions={toolbarActions}>{Math.round(camera.zoom * 100)}%</CameraToolbar>
    </div>
  );
};

CanvasDebug.displayName = 'Canvas.Debug';

//
// Theme
//

/** The theme picker and the grid over its background, at the bottom right. */
export const CanvasTheme = ({ classNames = 'bottom-2 right-2' }: CanvasBarProps) => {
  const { look, themes, themeOverride, themeGrid, guides, toggleGuides, onThemeChange, onBackgroundGridChange } =
    useCanvasContext('Canvas.Theme');
  return (
    <div className={mx(barFrame, classNames)}>
      <ThemePanel
        registry={themes}
        theme={look.theme}
        override={themeOverride}
        grid={look.background.grid}
        themeGrid={themeGrid}
        onThemeChange={onThemeChange}
        onGridChange={onBackgroundGridChange}
        guides={guides}
        onGuidesToggle={toggleGuides}
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
  const { tool, nodeRegistry, linkRegistry, capabilities, readonly, onReadonlyChange, setTool } =
    useCanvasContext('Canvas.Tools');
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
        onToolChange={setTool}
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
  const { controller, atoms, readonly, capabilities, timeline, time, playing, fps, seek, selection, timelineKeys } =
    useCanvasContext('Canvas.Timeline');
  const autoKey = useAtomValue(atoms.autoKey);
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
        fps={fps}
        keys={keys}
        autoKey={autoKey}
        readonly={readonly || !capabilities.update}
        onPlayingChange={controller.time.setPlaying}
        onTimeChange={seek}
        onAutoKeyChange={controller.time.setAutoKey}
        onAddKey={selection.size > 0 ? timelineKeys.addKey : undefined}
        onRemoveKey={selection.size > 0 ? timelineKeys.removeKey : undefined}
      />
    </div>
  );
};

CanvasTimeline.displayName = 'Canvas.Timeline';
