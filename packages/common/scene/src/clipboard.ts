//
// Copyright 2026 DXOS.org
//

import { endpointNode, rebindEndpoint } from './element.ts';
import { type LayoutIntent } from './intent.ts';
import { type Element2D, type Element3D, type LayoutRecord } from './Scene.ts';

/** A copied selection: a layout of its own, of the layout's dimension, holding the elements as they were copied. */
export type Fragment = LayoutRecord;

const elementsOf = (layout: LayoutRecord): Record<string, Element2D | Element3D> => layout.elements;

/**
 * The elements `ids` names as a fragment: a group brings its members, and a link comes only when both its ends do, so
 * nothing in the fragment points outside it.
 */
export const copyElements = (layout: LayoutRecord, ids: Iterable<string>): Fragment => {
  const elements = elementsOf(layout);
  const chosen = new Set<string>();
  const pending = [...ids];
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    const element = elements[id];
    if (element && !chosen.has(id)) {
      chosen.add(id);
      pending.push(...(element.members ?? []));
    }
  }
  // A link comes along when both its ends do, whether or not it was selected itself.
  for (const [id, element] of Object.entries(elements)) {
    if (
      element.source &&
      element.target &&
      chosen.has(endpointNode(element.source) ?? '') &&
      chosen.has(endpointNode(element.target) ?? '')
    ) {
      chosen.add(id);
    }
  }
  const kept = [...chosen].filter((id) => {
    const { source, target } = elements[id];
    return (
      (source === undefined || chosen.has(endpointNode(source) ?? '')) &&
      (target === undefined || chosen.has(endpointNode(target) ?? ''))
    );
  });
  const keptIds = new Set(kept);
  const copied = Object.fromEntries(
    Object.entries(elements)
      .filter(([id]) => keptIds.has(id))
      .map(([id, element]) => [
        id,
        element.members ? { ...element, members: element.members.filter((member) => keptIds.has(member)) } : element,
      ]),
  );
  return layout.dim === '2d'
    ? { id: 'clipboard', dim: '2d', elements: copied as Record<string, Element2D> }
    : { id: 'clipboard', dim: '3d', elements: copied as Record<string, Element3D> };
};

export type PasteOptions = {
  /** How far the pasted elements land from where they were copied: a grid step, further each repeat. */
  offset: { x: number; y: number; z?: number };
  /** A fresh id for an element of a kind. */
  newId: (prefix: string) => string;
  /** Whether placing an object would put it inside its own parts, here. */
  refuses?: (objectId: string) => boolean;
};

/**
 * One undoable batch that pastes `fragment` into `layout`: new ids, links and members rebound to them, each centre
 * shifted by the offset. Undefined for a fragment of the other dimension, or one that would place an object in its own
 * parts.
 */
export const pasteIntent = (
  layout: LayoutRecord,
  fragment: Fragment,
  { offset, newId, refuses }: PasteOptions,
): { intent: LayoutIntent; ids: string[] } | undefined => {
  if (fragment.dim !== layout.dim) {
    return undefined;
  }
  const source = Object.values(elementsOf(fragment));
  if (source.length === 0 || source.some((element) => element.object !== undefined && refuses?.(element.object))) {
    return undefined;
  }
  const idMap = new Map(source.map((element) => [element.id, newId(element.type ?? element.object ?? 'element')]));
  const rebound = <E extends Element2D | Element3D>(element: E): E => ({
    ...element,
    id: idMap.get(element.id) ?? element.id,
    ...(element.source ? { source: rebindEndpoint(element.source, (node) => idMap.get(node) ?? node) } : {}),
    ...(element.target ? { target: rebindEndpoint(element.target, (node) => idMap.get(node) ?? node) } : {}),
    ...(element.members ? { members: element.members.map((member) => idMap.get(member) ?? member) } : {}),
  });
  const intents: LayoutIntent[] =
    fragment.dim === '2d'
      ? Object.values(fragment.elements).map((element) => {
          const next = rebound(element);
          const center = next.center && { x: next.center.x + offset.x, y: next.center.y + offset.y };
          return { kind: 'create', element: center ? { ...next, center } : next };
        })
      : Object.values(fragment.elements).map((element) => {
          const next = rebound(element);
          const center = next.center && {
            x: next.center.x + offset.x,
            y: next.center.y + offset.y,
            z: next.center.z + (offset.z ?? 0),
          };
          return { kind: 'create', element: center ? { ...next, center } : next };
        });
  return { intent: { kind: 'batch', intents }, ids: [...idMap.values()] };
};
