//
// Copyright 2026 DXOS.org
//

//
// The compute projection (DESIGN.md §3) over the shared model: every `LayoutIntent` written to a board is mirrored into
// its compute graph, so a compute shape has one compute node and a link between two of them one compute edge.
//

import * as Schema from 'effect/Schema';

import { Obj } from '@dxos/echo';
import { type LayoutIntent, type Scene, applyIntent } from '@dxos/scene';

import {
  type ComputeGraphController,
  type ComputeLink,
  deleteTriggerObjects,
  findEdges,
  isValidComputeNode,
  syncCreate,
  syncLink,
} from '../graph/index.ts';
import { ComputeShape, parseAnchorId } from '../shapes/index.ts';
import { type BoardElement, shapeFromElement } from './echo-store.ts';

/** What the projection needs of the controller: the compute graph it mirrors into. */
export type ComputeGraphSource = Pick<ComputeGraphController, 'graph'>;

export type ComputeProjectionOptions = {
  controller: ComputeGraphSource;
};

export type ComputeProjection = {
  /**
   * The layout with `intent` applied and the compute graph brought along: a new compute shape (or a pasted copy) gets a
   * compute node of its own, a link adds its edge, a deleted shape or link takes its node or edge with it, and an end
   * moved to another port moves the edge. A link from a shape to itself is not written.
   */
  apply: (layout: Scene.LayoutRecord2D, intent: LayoutIntent) => Scene.LayoutRecord2D;
  /** The compute graph brought in line with a layout written another way (undo, redo), which wrote `after`. */
  restored: (before: Scene.LayoutRecord2D, after: Scene.LayoutRecord2D) => void;
};

const isComputeShape = Schema.is(ComputeShape);

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/** The compute node id an element carries, when it is a compute shape. */
const computeId = (element: BoardElement | undefined): string | undefined =>
  element && element.type !== undefined && isValidComputeNode(element.type) ? text(element.node) : undefined;

type Ends = { readonly source?: { readonly node?: string }; readonly target?: { readonly node?: string } };

const isSelfLink = (element: Ends): boolean =>
  element.source?.node !== undefined && element.source.node === element.target?.node;

/** The compute edge a link stands for: both ends on compute shapes, the ports naming the properties. */
const computeLink = (layout: Scene.LayoutRecord2D, link: BoardElement): ComputeLink | undefined => {
  const source = computeId(layout.elements[link.source?.node ?? '']);
  const target = computeId(layout.elements[link.target?.node ?? '']);
  if (link.type !== 'link' || !source || !target) {
    return undefined;
  }
  const output = link.source?.port === undefined ? undefined : parseAnchorId(link.source.port)[1];
  const input = link.target?.port === undefined ? undefined : parseAnchorId(link.target.port)[1];
  return { source, target, ...(output ? { output } : {}), ...(input ? { input } : {}) };
};

const sameLink = (left: ComputeLink | undefined, right: ComputeLink | undefined): boolean =>
  left?.source === right?.source &&
  left?.target === right?.target &&
  left?.output === right?.output &&
  left?.input === right?.input;

const computeShapes = (layout: Scene.LayoutRecord2D): Map<string, BoardElement> =>
  new Map(
    Object.values(layout.elements).flatMap((element) => {
      const id = computeId(element);
      return id ? [[id, element] as const] : [];
    }),
  );

const computeLinks = (layout: Scene.LayoutRecord2D): Map<string, ComputeLink> =>
  new Map(
    Object.values(layout.elements).flatMap((element) => {
      const link = computeLink(layout, element);
      return link ? [[element.id, link] as const] : [];
    }),
  );

export const createComputeProjection = ({ controller }: ComputeProjectionOptions): ComputeProjection => {
  /**
   * The intent with every new compute shape given a compute node id of its own (a pasted copy names its original's)
   * and every self-link dropped; the node itself is made by `sync`, as an undone delete's is.
   */
  const prepare = (
    layout: Scene.LayoutRecord2D,
    intent: LayoutIntent,
    claimed: Set<string>,
  ): LayoutIntent | undefined => {
    switch (intent.kind) {
      case 'create': {
        const { element } = intent;
        if (isSelfLink(element)) {
          return undefined;
        }
        if (element.type === undefined || !isValidComputeNode(element.type)) {
          return intent;
        }
        const node = text(Reflect.get(element, 'node'));
        if (node !== undefined && !claimed.has(node)) {
          claimed.add(node);
          return intent;
        }
        const copy = { ...element, node: Obj.ID.random() };
        return { kind: 'create', element: copy };
      }
      case 'bind':
        return isSelfLink(intent.link) ? undefined : intent;
      case 'batch': {
        const intents = intent.intents.flatMap((inner) => prepare(layout, inner, claimed) ?? []);
        return intents.length > 0 ? { kind: 'batch', intents } : undefined;
      }
      default:
        return intent;
    }
  };

  const sync = (before: Scene.LayoutRecord2D, after: Scene.LayoutRecord2D, removeTriggers: boolean): void => {
    const model = controller.graph;
    const shapesBefore = computeShapes(before);
    const shapesAfter = computeShapes(after);
    const removed = [...shapesBefore].filter(([id]) => !shapesAfter.has(id));
    const linksBefore = computeLinks(before);
    const linksAfter = computeLinks(after);
    const unlinked = [...linksBefore].filter(([id, link]) => !sameLink(link, linksAfter.get(id)));
    const linked = [...linksAfter].filter(([id, link]) => !sameLink(link, linksBefore.get(id)));

    // The edges are found before the nodes go, since removing a node may take its edges with it.
    const edges = findEdges(
      model,
      unlinked.map(([, link]) => link),
    );
    // `findNode`: a peer's delete may have removed the compute node before the shape.
    model.removeNodes(removed.flatMap(([id]) => (model.findNode(id) ? [id] : [])));
    model.removeEdges(edges.filter((id) => model.edges.some((edge) => edge.id === id)));
    if (removeTriggers) {
      deleteTriggerObjects(model, removed.map(([, element]) => shapeFromElement(element)).filter(isComputeShape));
    }
    for (const [id, element] of shapesAfter) {
      const shape = shapeFromElement(element);
      if (before.elements[element.id] === undefined && !model.findNode(id) && isComputeShape(shape)) {
        syncCreate(model, shape, id);
      }
    }
    for (const [, link] of linked) {
      model.findNode(link.source) && model.findNode(link.target) && syncLink(model, link);
    }
  };

  return {
    apply: (layout, intent) => {
      const prepared = prepare(
        layout,
        intent,
        new Set(Object.values(layout.elements).flatMap((element) => computeId(element) ?? [])),
      );
      const after = prepared ? applyIntent(layout, prepared) : layout;
      after !== layout && sync(layout, after, true);
      return after;
    },
    restored: (before, after) => sync(before, after, false),
  };
};
