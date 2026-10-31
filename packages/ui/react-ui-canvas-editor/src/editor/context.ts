//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { type ReactNode } from 'react';

import { type Timeline } from '@dxos/animation';
import { createContext } from '@dxos/react-hooks';
import { type Layer, type LayoutIntent, type ModelIntent, type Scene } from '@dxos/scene';

import { type SceneChoice } from '../components/index.ts';
import { type CameraActions } from '../components/index.ts';
import { type CommandTable } from './commands.ts';
import { type DimensionConfig } from './config.ts';
import { type History } from './history.ts';
import { type EditorStore } from './store.ts';
import { type EditorShot } from './timeline.ts';

/** What the display panel shows and sets: this viewer's look, grid, snapping, guides and axes. */
export type EditorDisplay = {
  /** The look's id: the viewer's pick over the scene's own. */
  theme: string;
  /** The viewer's pick, when they made one. */
  themeOverride?: string;
  grid: boolean;
  snap: boolean;
  guides?: boolean;
  /** The axes through the origin drawn. */
  axes?: boolean;
};

/** The config's parts that do not depend on its camera type, which the parts read through the context. */
export type EditorConfig = Omit<DimensionConfig, 'viewport' | 'camera'>;

/**
 * What `SceneEditor.Root` gives every part: the document as drawn, the open layout, the shared state and commands.
 * Dimension specifics come from the config; the camera's are bound in by the root, so no part needs its type.
 */
export type SceneEditorContextValue = {
  config: EditorConfig;
  document: Scene.SceneDocument;
  /** The document without its hidden layers' elements: what the viewport draws. */
  shown: Scene.SceneDocument;
  scene: string;
  /** The scene's own layout. */
  rootLayout: string | undefined;
  /** The open layout: the drill path's last, or the scene's own. */
  layout: string | undefined;
  store: EditorStore;
  readonly: boolean;
  onReadonlyChange?: (readonly: boolean) => void;
  commands: CommandTable;
  history?: History;
  /** Writes an edit, recorded for undo. */
  onIntent: (layout: string, intent: LayoutIntent) => void;
  /** Writes a model edit as one undo step; returns its problems. */
  onModelIntent?: (intent: ModelIntent) => readonly string[];
  onLayersChange?: (layout: string, layers: readonly Layer[]) => void;
  display: EditorDisplay;
  onDisplayChange?: (display: Partial<EditorDisplay>) => void;
  /** Picks the theme: the host's override when it stores one, otherwise this view's own. */
  onThemeChange: (theme: string | undefined) => void;
  camera?: { actions: CameraActions; percent?: number };
  docked: boolean;
  onDockedChange?: (docked: boolean) => void;
  sceneChoice?: SceneChoice;
  /** The shots staging the open scene, for the Timeline panel; undefined when the host offers no animation. */
  shots?: readonly EditorShot[];
  /** Writes a shot's timeline; an undefined shot id makes a new shot staging the scene. */
  onShotChange?: (shot: string | undefined, timeline: Timeline) => void;
  /** Whether the Timeline panel shows. */
  timeline: boolean;
  /** Shows or hides the Timeline panel; undefined when the host offers no animation. */
  onTimelineChange?: (timeline: boolean) => void;
  /** Draws the dimension's viewport with the floating panels over it. */
  renderViewport: (overlay: ReactNode) => ReactNode;
};

export const [SceneEditorProvider, useSceneEditor] = createContext<SceneEditorContextValue>('SceneEditor.Root');

/** The selection, read reactively. */
export const useEditorSelection = (consumer: string): readonly string[] => {
  const { store } = useSceneEditor(consumer);
  return useAtomValue(store.atoms.selection);
};

/** The editor's command table: the actions bar, the context menu, the shortcuts and the app's edit commands. */
export const useEditorCommands = (consumer: string): CommandTable => useSceneEditor(consumer).commands;
