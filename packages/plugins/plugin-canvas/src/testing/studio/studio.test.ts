//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

import { type ContentMap, Dsl } from '@dxos/diagram';
import { iconOf } from '@dxos/react-ui-canvas';

import { ROOT_VIEW_ID, isLinkRecord, isNodeRecord, readViews } from '../../model/content.ts';
import {
  STUDIO_CANVAS,
  STUDIO_GRID,
  type StudioModel,
  type StudioReport,
  findLink,
  parseStudioModel,
  seedStudioSlide,
} from './studio.ts';

const here = dirname(fileURLToPath(import.meta.url));

const slide = (name: string): { source: string; model: StudioModel } => ({
  source: readFileSync(join(here, `${name}.diagram`), 'utf8'),
  model: parseStudioModel(readFileSync(join(here, `${name}.json`), 'utf8')),
});

/** Every slide the deck exports, in its order; `agents` is seeded by the stories that register its kinds. */
const SLIDES = [
  'hyperspace',
  'echo-layers',
  'plugins',
  'composer',
  'architecture',
  'agents',
  'ontology',
  'chat',
  'agent',
] as const;

/** The edges the deck routes through waypoints, which is what the DSL cannot say. */
const viaEdges = (model: StudioModel): [string, string, { via: readonly { x: number; y: number }[] }][] =>
  model.edges.flatMap((edge) =>
    edge.length === 4 && edge[3].via?.length ? [[edge[0], edge[1], { via: edge[3].via }] as const] : [],
  );

/**
 * Every edge the loader can route: waypoints or an elbow direction, which it draws as a polyline.
 *
 * Not every route the deck draws. Round 3 brought two more the loader does not apply yet, so a slide using them is
 * drawn with those links straight: the named routes of the Composer slide (`route` with `region`, a link ending on
 * an app frame's region rather than on a shape) and its `dot` and `ends` decorations.
 */
const routedEdges = (model: StudioModel): number =>
  model.edges.filter((edge) => edge.length === 4 && Boolean(edge[3].via?.length || edge[3].elbow)).length;

/** Every edge the deck routes at all, which is what the loader would apply if it knew every route the deck draws. */
const routableEdges = (model: StudioModel): number =>
  model.edges.filter(
    (edge) => edge.length === 4 && Boolean(edge[3].via?.length || edge[3].elbow || edge[3].bend || edge[3].route),
  ).length;

describe('studio deck slides on a canvas', () => {
  test('every slide draws on the grid', ({ expect }) => {
    // The Neu ground draws none of its own, so a drawing would have nothing to place against.
    expect(STUDIO_CANVAS.backgroundGrid).toEqual('dots');
  });

  test.for(SLIDES)('%s.diagram parses with no problems', (name, { expect }) => {
    const { source } = slide(name);
    const { problems } = Dsl.parse(source);
    expect(problems.map((problem) => problem.message)).toEqual([]);
  });

  test.for(SLIDES)('%s lands every shape on the grid the drawing carries', (name, { expect }) => {
    // The deck was laid out by eye, so the import rounds its geometry to the pitch the drawing carries. Edges are
    // rounded, not centres and sizes, so a shape that was flush with another still is; and each corner moves by at
    // most half a cell, which is what keeps a slide looking like the slide. A member of a layout run is the exception: the
    // run takes one size and one pitch for all of it, which redistributes its members, so what holds for them is that
    // they stay inside the run's own box.
    const { source, model } = slide(name);
    const [before, after]: ContentMap[] = [{}, {}];
    seedStudioSlide(source, model, { grid: 1 })(before);
    seedStudioSlide(source, model)(after);
    const nodes = (content: ContentMap) =>
      Object.entries(content).flatMap(([key, record]) => (isNodeRecord(record) ? [[key, record.node] as const] : []));
    const was = new Map(nodes(before));
    for (const [key, node] of nodes(after)) {
      for (const edge of [
        node.center.x - node.size.width / 2,
        node.center.y - node.size.height / 2,
        node.center.x + node.size.width / 2,
        node.center.y + node.size.height / 2,
      ]) {
        // A text's box is measured from its own content, so only its top-left is on the grid.
        const derived = node.style?.fill === false && node.style?.border === false;
        expect({ key, off: derived ? 0 : edge % STUDIO_GRID }).toEqual({ key, off: 0 });
      }
      const original = was.get(key);
      expect(original).toBeDefined();
      const run = (model.layout ?? []).find(
        ({ kind, n, x, y, w, h }) =>
          kind !== 'stack' &&
          (n ?? 0) > 1 &&
          (original?.center.x ?? 0) > x &&
          (original?.center.x ?? 0) < x + w &&
          (original?.center.y ?? 0) > y &&
          (original?.center.y ?? 0) < y + h,
      );
      if (run) {
        expect({ key, inside: node.center.x > run.x && node.center.x < run.x + run.w }).toEqual({ key, inside: true });
        expect({ key, inside: node.center.y > run.y && node.center.y < run.y + run.h }).toEqual({ key, inside: true });
        continue;
      }
      // A card sized to its row or column keeps its centre, so its corner moves by half of what it gained or gave
      // back; everything else moves by at most half a cell.
      const extent = (shape: typeof node | undefined, axis: 'x' | 'y') =>
        shape ? (axis === 'x' ? shape.size.width : shape.size.height) : 0;
      const corner = (shape: typeof node | undefined, axis: 'x' | 'y') =>
        shape ? shape.center[axis] - extent(shape, axis) / 2 : 0;
      for (const axis of ['x', 'y'] as const) {
        const slack = Math.abs(extent(node, axis) - extent(original, axis)) / 2;
        expect({
          key,
          axis,
          far: Math.abs(corner(node, axis) - corner(original, axis)) > STUDIO_GRID + slack,
        }).toEqual({ key, axis, far: false });
      }
    }
  });

  test.for(SLIDES)('%s builds every card, frame and connector', (name, { expect }) => {
    const { source, model } = slide(name);
    const content: ContentMap = {};
    let report: StudioReport | undefined;
    seedStudioSlide(source, model, { report: (value) => (report = value) })(content);

    const root = readViews(content)[ROOT_VIEW_ID];
    const nodes = Object.values(root.nodes);
    // Every record the loader rewrote is still a valid node: an invalid one is silently dropped by `readViews`,
    // since the content map is untyped.
    // The slide's title and subtitle are not in the drawing: the presenter's heading carries them.
    const texts = (model.texts?.length ?? 0) + model.frames.filter((frame) => frame.label).length;
    // Every card, every frame, every text, and a placeholder for every component the deck draws itself.
    // A component's own regions are nodes too: the app frame's six are what its links end on.
    const components = (model.components ?? []).reduce((total, { parts }) => total + 1 + (parts?.length ?? 0), 0);
    expect(nodes).toHaveLength(Object.keys(model.nodes).length + model.frames.length + texts + components);
    // A card is drawn as the kind its sidecar names (`feed-card`, `chip`), or as the plain `card` when it names none.
    const kinds = new Set(Object.values(model.nodes).map((card) => card.kind ?? 'card'));
    const cards = nodes.filter((node) => kinds.has(node.type));
    expect(cards).toHaveLength(Object.keys(model.nodes).length);
    // Every card carries the icon the DSL could not say, as a glyph the frame can draw at a weight.
    expect(cards.every((card) => typeof iconOf(card)?.type === 'string')).toBe(true);
    // Every link survived as a link bound to two nodes, captions included.
    expect(Object.keys(root.links)).toHaveLength(model.edges.length);
    // At least the polylines, and at most every route the deck draws: the gap is the routes named above, which a
    // slide using them draws straight. Narrowing this range is how that gap closes.
    expect(report?.routed).toBeGreaterThanOrEqual(routedEdges(model));
    expect(report?.routed).toBeLessThanOrEqual(routableEdges(model));

    // Frames are still frames, and a frame's label came through the DSL.
    // A frame's label comes through the DSL, but it is drawn centred inside the frame, so the loader moves it out
    // to a label of its own beside the frame — a placement the scene language cannot state.
    for (const frame of model.frames.filter((frame) => frame.label)) {
      const title = content[`node:${frame.id}/title`];
      expect(isNodeRecord(title) && 'label' in title.node && title.node.label).toBe(frame.label);
      const box = content[`node:${frame.id}/frame`];
      expect(isNodeRecord(box) && 'label' in box.node).toBe(false);
    }
  });

  test.for(SLIDES)('%s leaves its title and subtitle to the slide heading', (name, { expect }) => {
    const { source, model } = slide(name);
    const content: ContentMap = {};
    seedStudioSlide(source, model)(content);
    for (const id of ['title/heading', 'title/subtitle']) {
      expect(content[`node:${id}`]).toBeUndefined();
    }
    // The text itself is still in the sidecar, which is where the heading reads it from. A slide may carry no
    // subtitle (Hyperspace does not), and then there is nothing for the heading to draw either.
    expect(model.title.length).toBeGreaterThan(0);
    expect(model.subtitle === null || model.subtitle === undefined || model.subtitle.length > 0).toBe(true);
  });

  test.for(SLIDES)('%s draws every component as its kind', (name, { expect }) => {
    const { source, model } = slide(name);
    const content: ContentMap = {};
    seedStudioSlide(source, model)(content);
    for (const component of model.components ?? []) {
      // The placeholder is an `ellipse ring` on the round-2 slide and a `rect box` on the round-3 ones.
      const key = ['ring', 'box']
        .map((part) => `node:${component.id}/${part}`)
        .find((candidate) => isNodeRecord(content[candidate]));
      const record = key === undefined ? undefined : content[key];
      expect(isNodeRecord(record)).toBe(true);
      const node = isNodeRecord(record) ? record.node : undefined;
      if (component.kind === 'fat-arrow') {
        // Plain shapes: a closed polyline is a filled polygon, so the arrow needs no kind of its own.
        expect(node?.type).toBe('polyline');
        expect(node && 'points' in node && node.points).toHaveLength(7);
        expect(node && 'params' in node && node.params).toEqual({ closed: true });
      } else {
        expect(node?.type).toBe(component.kind);
      }
      // A component that draws its own picture keeps its regions as geometry for its links to end on, and the
      // loader makes them invisible: the app frame's panes are drawn once, by the kind.
      for (const part of component.parts ?? []) {
        const region = content[`node:${component.id}/${part.id}`];
        expect(isNodeRecord(region) && region.node.style).toEqual({ fill: false, border: false });
      }
    }
  });

  test('the routes the sidecar carries are the ones the DSL dropped', ({ expect }) => {
    const { source, model } = slide('agent');
    const content: ContentMap = {};
    seedStudioSlide(source, model)(content);
    const routed = viaEdges(model);
    expect(routed.length).toBeGreaterThan(0);
    for (const [from, to, route] of routed) {
      const record = content[findLink(content, from, to)!];
      // The stored route is the waypoints with an attachment point on each node's outline, which is the only
      // form `diagramRoute` keeps (anything else is discarded and the connector re-routed).
      const stored = isLinkRecord(record) ? record.link.connector?.route : undefined;
      expect(stored?.slice(1, -1)).toEqual(route.via);
      expect(stored).toHaveLength(route.via.length + 2);
      // The ends stay bound to their nodes: a waypoint route is not a pair of free coordinates.
      expect(isLinkRecord(record) && record.link.source).toEqual({ node: `${from}/box` });
      expect(isLinkRecord(record) && record.link.target).toEqual({ node: `${to}/box` });
    }
  });
});
