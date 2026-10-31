//
// Copyright 2026 DXOS.org
//

import type * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import { type Timeline } from '@dxos/animation';
import { createContext } from '@dxos/react-hooks';
import { type ActiveTool, type FaceSelection } from '@dxos/react-ui-canvas';
import { type Layer, type LayoutIntent, type ModelIntent, type Scene } from '@dxos/scene';

import { type SceneChoice } from '../../components/index.ts';
import { type CommandTable } from '../commands.ts';
import { type Dimension, type DimensionConfig, type DisplayOptions } from '../config.ts';
import { type MenuAnchor } from '../store.ts';
import { type EditorShot } from '../timeline.ts';

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

/** The config's parts beside its dimension's aspects, which the parts read through the services. */
export type EditorConfig = Omit<DimensionConfig, 'create'>;

/** How far one camera-bar zoom step moves the camera, in both dimensions. */
export const ZOOM_STEP = 1.25;

/** Which of the host's writes it offers; a part offering one the host does not take hides or locks it. */
export type HostOffers = {
  /** Model edits (group, make object, styles, removing an object). */
  model: boolean;
  /** Layer edits. */
  layers: boolean;
  /** The lock toggle. */
  lock: boolean;
  /** The Timeline panel: the host gives shots and takes their changes. */
  animation: boolean;
  /** The host stores this viewer's camera. */
  camera: boolean;
  /** Copy, cut and paste: the host gives a `.dx` codec. */
  clipboard: boolean;
};

/** An aspect's slice of the editor: the atoms holding its state and the commands that change it (DESIGN.md §13.1). */
export type SceneAspect<Atoms, Commands> = { atoms: Atoms; commands: Commands };

export type DocumentAtoms = {
  document: Atom.Atom<Scene.SceneDocument>;
  /** The document without its hidden layers' elements, sampled at the playhead: what the viewport draws. */
  shown: Atom.Atom<Scene.SceneDocument>;
  scene: Atom.Atom<string>;
  /** The scene's own layout. */
  rootLayout: Atom.Atom<string | undefined>;
  /** The open layout: the drill path's last, or the scene's own. */
  layout: Atom.Atom<string | undefined>;
  readonly: Atom.Atom<boolean>;
  /** Drawn as a picture (a card, section or slide), which edits nothing. */
  picture: Atom.Atom<boolean>;
  host: Atom.Atom<HostOffers>;
  sceneChoice: Atom.Atom<SceneChoice | undefined>;
};

/** The one write path: each edit constrained by the layout's mode and recorded for undo. */
export type DocumentCommands = {
  intent: (layout: string, intent: LayoutIntent) => void;
  /** Writes a model edit as one undo step; returns its problems (none written when the host takes none). */
  modelIntent: (intent: ModelIntent) => readonly string[];
  /** Runs `change`, recording the intents it writes as one undo step. */
  transaction: (change: () => void) => void;
  setLayers: (layout: string, layers: readonly Layer[]) => void;
  setReadonly: (readonly: boolean) => void;
};

export type EditorDocument = SceneAspect<DocumentAtoms, DocumentCommands> & { config: EditorConfig };

export type NavigationAtoms = {
  /** The drill path into the scene's layouts: the root layout first; empty when the scene's own layout is open. */
  path: Atom.Atom<readonly string[]>;
  /** The camera bar shows: there is a camera the viewer may move. */
  zoomable: Atom.Atom<boolean>;
  /** The zoom as a percentage of the authored camera's. */
  percent: Atom.Atom<number | undefined>;
};

/** Moves this viewer's view, never the scene's authored camera. */
export type NavigationCommands = {
  /** Opens a layout by its drill path, the scene's own layout first. */
  open: (path: readonly string[]) => void;
  /** Frames the open layout's content. */
  fit: () => void;
  /** Actual size: the authored camera's scale, about the open layout's content. */
  actual: () => void;
  /** Closer by `factor` (above 1) or further (below 1). */
  zoomBy: (factor: number) => void;
};

export type EditorNavigation = SceneAspect<NavigationAtoms, NavigationCommands>;

export type SelectionAtoms = {
  selection: Atom.Atom<readonly string[]>;
  /** Dimension-specific: only 3D selects a face. */
  face: Atom.Atom<FaceSelection | undefined>;
};

export type SelectionCommands = {
  select: (ids: readonly string[]) => void;
  setFace: (face: FaceSelection | undefined) => void;
};

export type EditorSelection = SceneAspect<SelectionAtoms, SelectionCommands>;

export type EditorTools = SceneAspect<
  { tool: Atom.Atom<ActiveTool> },
  {
    setTool: (tool: ActiveTool) => void;
    /** Makes an element of `kind` in the middle of the view; without it, the create menu picks the kind's tool. */
    create?: (kind: string) => void;
  }
>;

export type CommandsAtoms = {
  /** The command table every surface reads: the actions bar, the context menu, the shortcuts and the app. */
  table: Atom.Atom<CommandTable>;
  menu: Atom.Atom<MenuAnchor | undefined>;
  /** A message about the last command (a refused paste, a failed import). */
  notice: Atom.Atom<string | undefined>;
};

export type CommandsCommands = {
  setMenu: (menu: MenuAnchor | undefined) => void;
  setNotice: (notice: string | undefined) => void;
};

export type EditorCommands = SceneAspect<CommandsAtoms, CommandsCommands>;

export type TimeAtoms = {
  /** The shots staging the open scene; undefined when the host offers no animation. */
  shots: Atom.Atom<readonly EditorShot[] | undefined>;
  /** The Timeline panel's shot, playhead (seconds) and whether it plays; sampled for the viewport, never written. */
  shot: Atom.Atom<string | undefined>;
  time: Atom.Atom<number>;
  playing: Atom.Atom<boolean>;
  /** The Timeline panel shows. */
  visible: Atom.Atom<boolean>;
};

export type TimeCommands = {
  setShot: (shot: string | undefined) => void;
  setTime: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  setVisible: (visible: boolean) => void;
  /** Writes a shot's timeline; an undefined shot id makes a new shot staging the scene. */
  writeShot: (shot: string | undefined, timeline: Timeline) => void;
};

export type EditorTime = SceneAspect<TimeAtoms, TimeCommands>;

/**
 * What `SceneEditor.Root` gives every part (COMMON-CORE Expectation 0): the services, built once per editor and config,
 * so a part re-renders for the atoms it reads rather than because the context changed.
 */
export type SceneEditorServices = {
  registry: Registry.AtomRegistry;
  config: EditorConfig;
  document: EditorDocument;
  navigation: EditorNavigation;
  selection: EditorSelection;
  tools: EditorTools;
  commands: EditorCommands;
  time: EditorTime;
} & Pick<Dimension, 'Root' | 'Viewport' | 'shortcuts'>;

export const [SceneEditorServicesProvider, useSceneServices] = createContext<SceneEditorServices>('SceneEditor.Root');

/** What the editor shows and the one write path. */
export const useSceneDocument = (consumer: string): EditorDocument => useSceneServices(consumer).document;

/** Where the view is: the drill path and this viewer's camera. */
export const useSceneNavigation = (consumer: string): EditorNavigation => useSceneServices(consumer).navigation;

/** What is selected. */
export const useSceneSelection = (consumer: string): EditorSelection => useSceneServices(consumer).selection;

/** The tool in hand. */
export const useSceneTools = (consumer: string): EditorTools => useSceneServices(consumer).tools;

/** The command table, the context menu and the last command's notice. */
export const useSceneCommands = (consumer: string): EditorCommands => useSceneServices(consumer).commands;

/** The Timeline panel's shots and playhead. */
export const useSceneTime = (consumer: string): EditorTime => useSceneServices(consumer).time;

/**
 * The look and display aids. They are the host's props resolved, so they ride their own provider, which changes only when
 * they do; a setter is absent when the host takes no changes, which hides its control.
 */
export type EditorLook = {
  display: EditorDisplay;
  options: DisplayOptions;
  setDisplay?: (display: Partial<EditorDisplay>) => void;
  /** Picks the theme: the host's override when it stores one, otherwise this view's own. */
  setTheme: (theme: string | undefined) => void;
};

export const [SceneLookProvider, useSceneLook] = createContext<EditorLook>('SceneEditor.Root');
