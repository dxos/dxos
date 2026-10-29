//
// Copyright 2026 DXOS.org
//

import { Scene, bounds3D, fitChild, radiusOf } from '@dxos/scene';

type Vec3 = Scene.Vec3;

/** Something to draw, in world space: an element of the root scene or of a child scene inside its frame. */
export type RenderItem = {
  /** Unique across the tree: the element ids on the path to it, joined by `/`. */
  key: string;
  id: string;
  /** The scene record the element belongs to, which a solid evaluates its operation tree against. */
  scene: Scene.SceneRecord3D;
  kind: string;
  label?: string;
  center: Vec3;
  scale: Vec3;
  rotation: Vec3;
  style?: Scene.Style;
  /** Set on a child-scene element, which draws as a frame round its child. */
  frame?: boolean;
};

export type RenderLink = { key: string; from: Vec3; to: Vec3; style?: Scene.Style };

export type RenderList = { items: RenderItem[]; links: RenderLink[] };

/** `world = offset + local * scale`. */
type Transform = { offset: Vec3; scale: number };

const IDENTITY: Transform = { offset: { x: 0, y: 0, z: 0 }, scale: 1 };
const UNIT: Vec3 = { x: 1, y: 1, z: 1 };
const ZERO: Vec3 = { x: 0, y: 0, z: 0 };

const apply = ({ offset, scale }: Transform, point: Vec3): Vec3 => ({
  x: offset.x + point.x * scale,
  y: offset.y + point.y * scale,
  z: offset.z + point.z * scale,
});

const scaled = (vector: Vec3, scale: number): Vec3 => ({
  x: vector.x * scale,
  y: vector.y * scale,
  z: vector.z * scale,
});

/** `outer ∘ inner`: first the inner transform, then the outer. */
const compose = (outer: Transform, inner: Transform): Transform => ({
  offset: apply(outer, inner.offset),
  scale: outer.scale * inner.scale,
});

/**
 * Everything a document's root 3D scene draws, in world space: elements and links, with each child scene placed
 * inside its frame (design call 23). Hidden elements, groups and unplaced elements draw nothing; a link whose end is
 * missing is skipped (Review Focus 1); a child scene already on the path is not entered again (Review Focus 2).
 */
export const renderList = (
  doc: Scene.SceneDocument,
  overrides?: Readonly<Record<string, Partial<Scene.Element3D>>>,
): RenderList => {
  const byId = new Map(doc.scenes.map((scene) => [scene.id, scene]));
  const items: RenderItem[] = [];
  const links: RenderLink[] = [];

  const visit = (scene: Scene.SceneRecord3D, transform: Transform, prefix: string, path: readonly string[]) => {
    const keyOf = (id: string) => (prefix ? `${prefix}/${id}` : id);
    const elementOf = (element: Scene.Element3D): Scene.Element3D =>
      prefix === '' && overrides?.[element.id] ? { ...element, ...overrides[element.id] } : element;
    const placed = new Map<string, Vec3>();
    for (const raw of Object.values(scene.elements)) {
      const element = elementOf(raw);
      // A solid's geometry is its operands', placed where they are, so it needs no position of its own.
      const local = element.center ?? (element.kind === 'solid' ? ZERO : undefined);
      if (element.hidden || !local || element.kind === 'link' || element.kind === 'group') {
        continue;
      }
      const center = apply(transform, local);
      placed.set(element.id, center);
      const item: RenderItem = {
        key: keyOf(element.id),
        id: element.id,
        scene,
        kind: element.kind === 'scene' ? (stringProp(element, 'shape') ?? 'cube') : element.kind,
        center,
        scale: scaled(element.scale ?? UNIT, transform.scale),
        rotation: element.rotation ?? ZERO,
        ...(element.label !== undefined ? { label: element.label } : {}),
        ...(element.style ? { style: element.style } : {}),
        ...(element.kind === 'scene' ? { frame: true } : {}),
      };
      items.push(item);
      const child = element.scene === undefined ? undefined : byId.get(element.scene);
      if (child?.dim === '3d' && !path.includes(child.id)) {
        const fit = fitChild({ center: local, radius: radiusOf(element) }, bounds3D(child));
        visit(child, compose(transform, fit), item.key, [...path, child.id]);
      }
    }
    for (const raw of Object.values(scene.elements)) {
      const element = elementOf(raw);
      if (element.kind !== 'link' || element.hidden || !element.from || !element.to) {
        continue;
      }
      const from = placed.get(element.from.element);
      const to = placed.get(element.to.element);
      if (from && to) {
        links.push({ key: keyOf(element.id), from, to, ...(element.style ? { style: element.style } : {}) });
      }
    }
  };

  const root = doc.scenes[0];
  if (root?.dim === '3d') {
    visit(root, IDENTITY, '', [root.id]);
  }
  return { items, links };
};

const stringProp = (element: Scene.Element3D, name: string): string | undefined => {
  const value = element.props?.[name];
  return typeof value === 'string' ? value : undefined;
};
