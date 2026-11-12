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

const SLIDES = ['ontology', 'chat', 'agent'] as const;

/** The edges the deck routes through waypoints, which is what the DSL cannot say. */
const viaEdges = (model: StudioModel): [string, string, { via: readonly { x: number; y: number }[] }][] =>
  model.edges.flatMap((edge) =>
    edge.length === 4 && edge[3].via?.length ? [[edge[0], edge[1], { via: edge[3].via }] as const] : [],
  );

/** Every edge the deck routes at all: waypoints or an elbow direction. */
const routedEdges = (model: StudioModel): number =>
  model.edges.filter((edge) => edge.length === 4 && (edge[3].via?.length || edge[3].elbow)).length;

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
    expect(nodes).toHaveLength(Object.keys(model.nodes).length + model.frames.length + texts);
    const cards = nodes.filter((node) => node.type === 'card');
    expect(cards).toHaveLength(Object.keys(model.nodes).length);
    // Every card carries the icon the DSL could not say, as a glyph the frame can draw at a weight.
    expect(cards.every((card) => typeof iconOf(card)?.type === 'string')).toBe(true);
    // Every link survived as a link bound to two nodes, captions included.
    expect(Object.keys(root.links)).toHaveLength(model.edges.length);
    expect(report?.routed).toBe(routedEdges(model));

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
    // The text itself is still in the sidecar, which is where the heading reads it from.
    expect([model.title, model.subtitle].every((text) => text.length > 0)).toBe(true);
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
