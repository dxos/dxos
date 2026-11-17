//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

import { type ContentMap, Dsl, applyCommands } from '@dxos/diagram';
import { ROOT_VIEW_ID, SceneHandler, iconOf, isLinkRecord, isNodeRecord, readViews } from '@dxos/react-ui-canvas';
import { NODE_TYPES } from '@dxos/scene';

import { seedSlide, studioSlide } from './slides.ts';
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
    // The deck was laid out by eye, so the import rounds its geometry to the pitch the drawing carries, then
    // regularises it: a row takes one height, a column one width and one gap, and a slide may be spread. Where the
    // shapes end up is the drawing's business; what has to hold is that every edge is on the grid.
    const { source, model } = slide(name);
    const content: ContentMap = {};
    seedStudioSlide(source, model)(content);
    const nodes = Object.entries(content).flatMap(([key, record]) =>
      isNodeRecord(record) ? [[key, record.node] as const] : [],
    );
    expect(nodes.length).toBeGreaterThan(0);
    for (const [key, node] of nodes) {
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
    }
  });

  test.for(SLIDES)('%s leaves no two cards overlapping', (name, { expect }) => {
    // What the regularising passes must not do: a column laid out on one gap, a row given one height or a card drawn
    // at a size of its own could each push a card into its neighbour.
    const { source, model } = slide(name);
    const content: ContentMap = {};
    seedStudioSlide(source, model)(content);
    const cards = Object.keys(model.nodes).flatMap((id) => {
      const record = content[`node:${id}/box`];
      return isNodeRecord(record) ? [{ id, node: record.node }] : [];
    });
    for (let index = 0; index < cards.length; index++) {
      for (let other = index + 1; other < cards.length; other++) {
        const [left, right] = [cards[index], cards[other]];
        const overlap =
          Math.abs(left.node.center.x - right.node.center.x) < (left.node.size.width + right.node.size.width) / 2 &&
          Math.abs(left.node.center.y - right.node.center.y) < (left.node.size.height + right.node.size.height) / 2;
        expect({ pair: `${left.id}/${right.id}`, overlap }).toEqual({ pair: `${left.id}/${right.id}`, overlap: false });
      }
    }
  });

  test.for(SLIDES)('%s keeps every laid-out run inside its own box', (name, { expect }) => {
    // The run's extent and its pitch are each rounded to the grid, so they have to be chosen together: rounded
    // independently they overrun the box the sidecar gave the run, and a member's BOX leaves it while its centre
    // stays inside — so this checks edges, against the run's OWN span rather than a grid-rounded one, which would
    // round the bound up by as much as the overrun and accept it.
    const { source, model } = slide(name);
    const content: ContentMap = {};
    seedStudioSlide(source, model)(content);
    const onGrid = (value: number) => Math.round(value / STUDIO_GRID) * STUDIO_GRID;
    for (const run of model.layout ?? []) {
      if (run.kind === 'stack' || (run.n ?? 0) < 2) {
        continue;
      }
      // Only the axis the run lays out along: across it the breadth is rounded up on purpose, so a card may sit
      // wider than the sidecar's own box and that is not this bug.
      const down = run.kind === 'down';
      const origin = onGrid(down ? run.y : run.x);
      const limit = origin + (down ? run.h : run.w);
      // Cards AND components: the Hyperspace planks a run lays out are components, so walking `nodes` alone would
      // check none of that run's members and pass whatever the run did.
      const ids = [...Object.keys(model.nodes), ...(model.components ?? []).map(({ id }) => id)];
      for (const id of ids) {
        const record = ['box', 'ring'].map((part) => content[`node:${id}/${part}`]).find(isNodeRecord);
        if (!record) {
          continue;
        }
        const { center, size } = record.node;
        if (!(center.x > run.x && center.x < run.x + run.w && center.y > run.y && center.y < run.y + run.h)) {
          continue;
        }
        const along = down ? center.y : center.x;
        const extent = down ? size.height : size.width;
        const edges = { from: along - extent / 2 >= origin, to: along + extent / 2 <= limit };
        expect({ id, ...edges }).toEqual({ id, from: true, to: true });
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

  test('the Agents taps are styled in kind mode and dropped in generator mode', ({ expect }) => {
    // A tap ends INSIDE a component, and the Agents space graph is drawn as `space/ring` rather than a box. The frame
    // lookup and the link lookup both have to accept that endpoint: whichever one still wants a box skips the edge,
    // and the two modes fail differently — kind mode leaves the link with the DSL's own arrowhead, generator mode
    // leaves it undeleted on top of the run the generator draws.
    const { source, model } = slide('agents');
    const taps = model.edges.flatMap((edge) => (edge.length === 4 && edge[3].tap ? [[edge[0], edge[1]] as const] : []));
    expect(taps.length).toBe(4);

    const kind: ContentMap = {};
    seedStudioSlide(source, model, { components: 'kind' })(kind);
    for (const [from, to] of taps) {
      const edge = `${from}->${to}`;
      const key = findLink(kind, from, to);
      expect({ edge, found: key !== undefined }).toEqual({ edge, found: true });
      const record = key === undefined ? undefined : kind[key];
      const ends = record && isLinkRecord(record) ? (record.link.ends ?? {}) : undefined;
      // Every one of them is `arrow: 'none'` in the sidecar, which is applied only once the link has been found.
      expect({ edge, head: ends !== undefined && 'end' in ends }).toEqual({ edge, head: false });
    }

    const generated: ContentMap = {};
    seedStudioSlide(source, model, { components: 'generator' })(generated);
    const links = (content: ContentMap) => Object.values(content).filter(isLinkRecord).length;
    // Generator mode drops the four tap links, since a `Generator` cannot be linked to at all.
    expect({ kind: links(kind), generated: links(generated) }).toEqual({ kind: 11, generated: 7 });
  });

  test("a card's chips are placed as their own elements", ({ expect }) => {
    // Chips used to be a field the card painted (`data.chips`), which a composite's fixed parts cannot express and
    // which left the `chip` kind — a real kind, with its own schema and view — drawn by nothing. They are elements
    // now: selectable, stylable, and inside the card that declares them.
    const slides = [studioSlide('echo-layers'), studioSlide('architecture')];
    for (const slide of slides) {
      const content: ContentMap = {};
      seedSlide(slide)(content, ROOT_VIEW_ID);
      const chips = Object.values(content).flatMap((record) =>
        isNodeRecord(record) && record.node.type === 'chip' ? [record.node] : [],
      );
      const declared = (slide.spec?.groups ?? []).flatMap((group) => [
        ...(group.banner?.chips?.items ?? []),
        ...(group.columns ?? []).flat().flatMap((cell) => ('chips' in cell ? (cell.chips?.items ?? []) : [])),
      ]);
      expect({ slide: slide.id, chips: chips.length }).toEqual({ slide: slide.id, chips: declared.length });
      // Every one carries the label its spec gave it, and none is left inside a card's data.
      for (const node of chips) {
        expect(typeof node.label).toBe('string');
      }
      const withChipData = Object.values(content).filter(
        (record) => isNodeRecord(record) && record.node.data && 'chips' in (record.node.data as object),
      );
      expect({ slide: slide.id, inCardData: withChipData.length }).toEqual({ slide: slide.id, inCardData: 0 });
    }
  });

  test.for(SLIDES)('%s keeps every contributed kind through records, text and records', (name, { expect }) => {
    // The losslessness the design asks for is a property, so it is tested rather than inspected. Before the box
    // carried a kind, every card, plank and chip of a slide printed as a plain `rect` and `Rebuild` replaced the
    // drawing with boxes: 24 kinds on the Ontology slide became 27 rects.
    const { source, model } = slide(name);
    const content: ContentMap = {};
    seedStudioSlide(source, model)(content);
    const kindsOf = (map: ContentMap): Record<string, number> => {
      const histogram: Record<string, number> = {};
      for (const node of Object.values(readViews(map)[ROOT_VIEW_ID].nodes)) {
        if (!NODE_TYPES.includes(node.type as (typeof NODE_TYPES)[number])) {
          histogram[node.type] = (histogram[node.type] ?? 0) + 1;
        }
      }
      return histogram;
    };

    // The kind's own fields, not just its name: a card that comes back as a card with none of its data is no
    // better than a box. Scalars only — a field holding a list or a nested object has no spelling in the DSL, and
    // `handler.test.ts` is where that gap is stated.
    const dataOfKinds = (map: ContentMap) =>
      Object.values(readViews(map)[ROOT_VIEW_ID].nodes)
        .filter((node) => !NODE_TYPES.includes(node.type as (typeof NODE_TYPES)[number]))
        .map((node) => {
          const bag = Reflect.get(node, 'data');
          const scalars = Object.entries(typeof bag === 'object' && bag !== null ? bag : {}).filter(
            ([, value]) => typeof value !== 'object',
          );
          return JSON.stringify([node.type, scalars.sort(([left], [right]) => (left < right ? -1 : 1))]);
        })
        .sort();

    const before = kindsOf(content);
    const beforeData = dataOfKinds(content);
    expect(Object.keys(before).length).toBeGreaterThan(0);
    const text = Dsl.print(SceneHandler.read(content).scene);
    const { commands, problems } = Dsl.read(text);
    expect(problems).toEqual([]);
    const rebuilt: ContentMap = {};
    applyCommands(rebuilt, commands, SceneHandler);
    expect(kindsOf(rebuilt)).toEqual(before);
    expect(dataOfKinds(rebuilt)).toEqual(beforeData);

    // A link keeps its markers and its line style too. These live on the link itself on a plain canvas and on a
    // connector on a routed one, and `read` used to look only at the connector: 51 of the deck's 64 connectors
    // came back as a default arrow instead of the triangle they were drawn with.
    const marksOfLinks = (map: ContentMap) =>
      Object.values(readViews(map)[ROOT_VIEW_ID].links)
        .map((link) => [link.ends?.start, link.ends?.end, link.style?.lineStyle, link.style?.hue].join('/'))
        .sort();
    expect(marksOfLinks(rebuilt)).toEqual(marksOfLinks(content));

    // And its route, point for point. A connector routed by hand or by the layout had no spelling at all, so the
    // deck's 14 routed connectors lost all 66 of their bends and snapped back to straight runs.
    const routesOfLinks = (map: ContentMap) =>
      Object.values(readViews(map)[ROOT_VIEW_ID].links)
        .map((link) => JSON.stringify(link.connector?.route ?? []))
        .sort();
    expect(routesOfLinks(rebuilt)).toEqual(routesOfLinks(content));
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
