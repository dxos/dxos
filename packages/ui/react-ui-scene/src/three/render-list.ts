//
// Copyright 2026 DXOS.org
//

import {
  type Resolved3D,
  Scene,
  bounds3D,
  findLayout,
  fitChild,
  radiusOf,
  resolveLayout3D,
  rootScene,
} from '@dxos/scene';

type Vec3 = Scene.Vec3;

/** Something to draw, in world space: an element of the scene's layout or of a composite's parts inside its frame. */
export type RenderItem = {
  /** Unique across the tree: the element ids on the path to it, joined by `/`. */
  key: string;
  id: string;
  /** The resolved elements of the layout the element belongs to, which a solid evaluates its operation tree against. */
  elements: Readonly<Record<string, Resolved3D>>;
  kind: string;
  label?: string;
  center: Vec3;
  scale: Vec3;
  rotation: Vec3;
  style?: Scene.Style;
  /** Set on a composite element, which draws as a frame round its parts. */
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
 * Everything a document's 3D scene draws, in world space: its layout's elements and links, with each composite's parts
 * layout placed inside its frame (design call 23). Hidden elements, groups and unplaced elements draw nothing; a link
 * whose end is missing is skipped (Review Focus 1); a layout already on the path is not entered again (Review Focus 2).
 */
export const renderList = (
  doc: Scene.SceneDocument,
  scene: Scene.SceneRecord | undefined = rootScene(doc),
  overrides?: Readonly<Record<string, Partial<Scene.Element3D>>>,
): RenderList => {
  const items: RenderItem[] = [];
  const links: RenderLink[] = [];

  const visit = (layout: Scene.LayoutRecord3D, transform: Transform, prefix: string, path: readonly string[]) => {
    const keyOf = (id: string) => (prefix ? `${prefix}/${id}` : id);
    // Overrides apply to the scene's own layout only, before resolving, as an element's own values would.
    const own =
      prefix === '' && overrides
        ? {
            ...layout,
            elements: Object.fromEntries(
              Object.entries(layout.elements).map(([key, element]) => [key, { ...element, ...overrides[element.id] }]),
            ),
          }
        : layout;
    const elements = resolveLayout3D(doc, own);
    const placed = new Map<string, Vec3>();
    for (const element of Object.values(elements)) {
      // A solid's geometry is its operands', placed where they are, so it needs no position of its own.
      const local = element.center ?? (element.kind === 'solid' ? ZERO : undefined);
      if (element.hidden || !local || element.kind === 'link' || element.kind === 'group') {
        continue;
      }
      const center = apply(transform, local);
      placed.set(element.id, center);
      const composite = element.parts !== undefined;
      const item: RenderItem = {
        key: keyOf(element.id),
        id: element.id,
        elements,
        kind: element.kind,
        center,
        scale: scaled(element.scale ?? UNIT, transform.scale),
        rotation: element.rotation ?? ZERO,
        ...(element.label !== undefined ? { label: element.label } : {}),
        ...(element.style ? { style: element.style } : {}),
        ...(composite ? { frame: true } : {}),
      };
      items.push(item);
      const parts = element.parts === undefined ? undefined : findLayout(doc, element.parts);
      if (parts?.dim === '3d' && !path.includes(parts.id)) {
        const fit = fitChild({ center: local, radius: radiusOf(element) }, bounds3D(resolveLayout3D(doc, parts)));
        visit(parts, compose(transform, fit), item.key, [...path, parts.id]);
      }
    }
    for (const element of Object.values(elements)) {
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

  const layout = scene && findLayout(doc, scene.layout);
  if (scene?.dim === '3d' && layout?.dim === '3d') {
    visit(layout, IDENTITY, '', [layout.id]);
  }
  return { items, links };
};
