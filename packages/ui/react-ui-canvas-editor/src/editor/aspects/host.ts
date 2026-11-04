//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import { type Timeline } from '@dxos/animation';
import { type Layer, type LayoutIntent, type ModelIntent, type Scene } from '@dxos/scene';

import { type SceneChoice } from '../../components/index.ts';
import { type ClipboardCodec, type DimensionConfig } from '../config.ts';
import { type History } from '../history.ts';
import { type EditorStore } from '../store.ts';
import { type EditorShot } from '../timeline.ts';
import { type EditorDisplay } from './context.ts';

/**
 * Whether a role edits the scene: only the article (`article`, or a namespaced `….article`), or no role (a story); a
 * card, section or slide is a picture.
 */
export const editsInRole = (role: string | undefined): boolean =>
  role === undefined || role.split('.').at(-1) === 'article';

/** What the host gives the editor: its document, where edits go, and this viewer's view. */
export type SceneEditorHostProps<C> = {
  document: Scene.SceneDocument;
  scene: string;
  role?: string;
  readonly?: boolean;
  onReadonlyChange?: (readonly: boolean) => void;
  /** Writes an edit to the document; the editor records it in `history`. */
  onIntent: (layout: string, intent: LayoutIntent) => void;
  history?: History;
  /** Writes a model edit; returns its problems. Recorded as one step when `readDocument` is given. */
  onModelIntent?: (intent: ModelIntent) => readonly string[];
  /** The document as stored now, read either side of a model edit for its undo step. */
  readDocument?: () => Scene.SceneDocument;
  onLayersChange?: (layout: string, layers: readonly Layer[]) => void;
  /** The `.dx` text a copy writes and a paste reads. */
  codec?: ClipboardCodec;
  display: EditorDisplay;
  onDisplayChange?: (display: Partial<EditorDisplay>) => void;
  /** This viewer's camera, undefined until they move it; `authoredCamera` is the scene's own. */
  camera?: C;
  authoredCamera?: C;
  onCameraChange?: (camera: C) => void;
  sceneChoice?: SceneChoice;
  /** The shots staging the scene, for the Timeline panel. */
  shots?: readonly EditorShot[];
  /** Writes a shot's timeline; an undefined shot id makes a new shot staging the scene. */
  onShotChange?: (shot: string | undefined, timeline: Timeline) => void;
  /**
   * Whether the Timeline panel shows; hidden by default. With `onTimelineChange` the host owns it, otherwise it is where
   * the panel starts and the display panel's toggle changes it for this view alone.
   */
  timeline?: boolean;
  onTimelineChange?: (timeline: boolean) => void;
};

/** The host's props as last rendered, with the look resolved; the commands read it when they run. */
export type SceneEditorLatest<C> = { props: SceneEditorHostProps<C>; display: EditorDisplay };

/** What every aspect is built from: the registry, the config, the host's props as last rendered and the view state. */
export type AspectOptions<C> = {
  registry: Registry.AtomRegistry;
  config: DimensionConfig<C>;
  latest: { readonly current: SceneEditorLatest<C> };
  store: EditorStore;
};

/** An atom kept for the editor's lifetime, so a part that unmounts does not reset it. */
export const keep = <A>(value: A): Atom.Writable<A> => Atom.keepAlive(Atom.make(value));

/** Sets `atom` only when `value` differs, so a host's re-render notifies no part. */
export const setChanged = <A>(registry: Registry.AtomRegistry, atom: Atom.Writable<A>, value: A): void => {
  Object.is(registry.get(atom), value) || registry.set(atom, value);
};
