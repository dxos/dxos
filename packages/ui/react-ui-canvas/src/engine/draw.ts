//
// Copyright 2026 DXOS.org
//

//
// The scene as the engine draws it (COMMON-CORE C.2): the open render list, and the edits a gesture or a command makes
// of it. The edits land in the draw state only; what they leave there reaches the host as layout intents, and the
// layout's mode (the host's `constrain`) decides what is stored.
//

import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import { type ViewId } from '@dxos/scene';

import { type Capabilities, type View, type ViewStore, updateView } from '../model/index.ts';
import { type LatticeSpec, type SceneEdit } from '../utils/index.ts';
import { type CanvasHistory } from './history.ts';

export type DrawScene = {
  /** The open scene, re-emitted on every change. */
  readonly scene: Atom.Atom<View>;
  /** Applies `edit` to the open scene. */
  apply: (edit: SceneEdit) => void;
  /** What a person may do to the scene. */
  readonly capabilities: Capabilities;
  /**
   * What the layout's mode would make of `edit`: the edit it would store, or undefined when it would refuse it. Absent,
   * edits are stored as given. Previews of a gesture in flight read it, so a drag shows where the drop will land.
   */
  constrain?: (edit: SceneEdit) => SceneEdit | undefined;
  /** The lattice the layout keeps shapes on, for the grid layer that draws it (DESIGN §8b). */
  lattice?: LatticeSpec;
};

export const freehandCapabilities: Capabilities = {
  move: true,
  resize: true,
  link: true,
  create: true,
  delete: true,
  update: true,
  layout: true,
};

/** What a lattice layout allows: everything but an arrangement, which would take shapes off its cells. */
export const latticeCapabilities: Capabilities = { ...freehandCapabilities, layout: false };

const CAPABILITIES = [
  'move',
  'resize',
  'link',
  'create',
  'delete',
  'update',
  'layout',
] as const satisfies readonly (keyof Capabilities)[];

/** What both `base` and `allowed` allow. */
export const intersectCapabilities = (base: Capabilities, allowed: Capabilities): Capabilities =>
  Object.fromEntries(CAPABILITIES.map((key) => [key, !!base[key] && !!allowed[key]]));

/** What a read-only view may do: look, select and navigate, nothing that reaches the model. */
export const readonlyCapabilities: Capabilities = {
  move: false,
  resize: false,
  link: false,
  create: false,
  delete: false,
  update: false,
  layout: false,
};

export type DrawSceneOptions = {
  registry: Registry.AtomRegistry;
  store: ViewStore;
  sceneId: ViewId;
  capabilities?: Capabilities;
  constrain?: DrawScene['constrain'];
  lattice?: LatticeSpec;
};

const EMPTY: View = { id: '', nodes: {}, links: {} };

/** The scene `sceneId` of the draw state, every edit written straight into it. */
export const createDrawScene = ({
  registry,
  store,
  sceneId,
  capabilities = freehandCapabilities,
  constrain,
  lattice,
}: DrawSceneOptions): DrawScene => ({
  scene: Atom.keepAlive(Atom.make((get) => get(store.view(sceneId)) ?? EMPTY)),
  apply: (edit) => updateView(registry, store, sceneId, edit),
  capabilities,
  constrain,
  lattice,
});

/** The scene with every edit applied as a commit of `history`, so each one is an undo step. */
export const withHistory = (draw: DrawScene, history: Pick<CanvasHistory, 'commit'>): DrawScene => ({
  ...draw,
  apply: (edit) => void history.commit(() => draw.apply(edit)),
});
