//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';

import { sceneTree } from './hierarchy.ts';
import {
  type Element2D,
  type Element3D,
  Scene2D,
  Scene3D,
  type SceneDocument,
  type SceneRecord,
  type StoredElement2D,
  type StoredElement3D,
} from './Scene.ts';

export type StoredScene = Scene2D | Scene3D;

/** A deep copy free of ECHO proxies, so records read back are plain data. */
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const isStoredScene = (value: unknown): value is StoredScene =>
  Obj.instanceOf(Scene2D, value) || Obj.instanceOf(Scene3D, value);

const storeElement = <E extends Element2D | Element3D>(
  element: E,
  made: ReadonlyMap<string, StoredScene>,
): E & { child?: Ref.Ref<StoredScene> } => {
  const child = element.scene === undefined ? undefined : made.get(element.scene);
  return child ? { ...element, child: Ref.make(child) } : element;
};

const storeScene = (record: SceneRecord, made: ReadonlyMap<string, StoredScene>): StoredScene => {
  const { id, dim, ...rest } = record;
  if (dim === '2d') {
    const elements: Record<string, StoredElement2D> = {};
    for (const [key, element] of Object.entries(record.elements)) {
      elements[key] = storeElement(element, made);
    }
    return Obj.make(Scene2D, { ...rest, key: id, camera: record.camera, elements });
  }
  const elements: Record<string, StoredElement3D> = {};
  for (const [key, element] of Object.entries(record.elements)) {
    elements[key] = storeElement(element, made);
  }
  return Obj.make(Scene3D, { ...rest, key: id, camera: record.camera, elements });
};

/**
 * Makes one ECHO object per scene (design call 20). Children are made before the scenes that hold them, so each
 * child-scene element carries a Ref to its child; one that would close a cycle keeps only the child's id.
 */
export const toEcho = (doc: SceneDocument): { root: StoredScene; scenes: Map<string, StoredScene> } => {
  const byId = new Map(doc.scenes.map((scene) => [scene.id, scene]));
  const made = new Map<string, StoredScene>();
  // Pre-order lists a parent before its descendants, so its reverse makes every child first; scenes the root does not
  // reach come last, so none is lost.
  const order = sceneTree(doc).order;
  const unreached = doc.scenes.map((scene) => scene.id).filter((id) => !order.includes(id));
  for (const id of [...[...order].reverse(), ...unreached]) {
    const record = byId.get(id);
    if (record) {
      made.set(id, storeScene(record, made));
    }
  }
  const root = doc.scenes[0] && made.get(doc.scenes[0].id);
  if (!root) {
    throw new Error('A scene document needs a root scene.');
  }
  return { root, scenes: made };
};

const readElement = <S extends { child?: Ref.Ref<unknown> }>({
  child,
  ...element
}: S): { record: Omit<S, 'child'>; scene?: { scene: string }; child?: StoredScene } => {
  const target = child?.target;
  const scene = isStoredScene(target) ? target : undefined;
  return { record: plain(element), scene: scene && { scene: scene.key }, child: scene };
};

/** Reads a scene and every loaded child scene back into record form, depth-first from `root`. */
export const fromEcho = (root: StoredScene): SceneDocument => {
  const scenes: SceneRecord[] = [];
  const seen = new Set<string>();
  const visit = (scene: StoredScene) => {
    if (seen.has(scene.key)) {
      return;
    }
    seen.add(scene.key);
    const children: StoredScene[] = [];
    const base = plain({ name: scene.name, theme: scene.theme, component: scene.component });
    if (Obj.instanceOf(Scene2D, scene)) {
      const elements: Record<string, Element2D> = {};
      for (const [key, element] of Object.entries(scene.elements)) {
        const { record, scene: reference, child } = readElement(element);
        elements[key] = { ...record, ...reference };
        child && children.push(child);
      }
      scenes.push({ id: scene.key, dim: '2d', ...base, camera: plain(scene.camera), elements });
    } else {
      const elements: Record<string, Element3D> = {};
      for (const [key, element] of Object.entries(scene.elements)) {
        const { record, scene: reference, child } = readElement(element);
        elements[key] = { ...record, ...reference };
        child && children.push(child);
      }
      scenes.push({ id: scene.key, dim: '3d', ...base, camera: plain(scene.camera), elements });
    }
    children.forEach(visit);
  };
  visit(root);
  return { scenes };
};
