//
// Copyright 2026 DXOS.org
//

//
// A slide said as what it IS — groups of columns of cards, and the edges between them — rather than as the boxes the
// deck happened to place. The loader in `studio.ts` imports the deck's geometry and recovers this structure from
// coordinates (which cards overlap in x is a column, which text sits above a cluster is its heading); every change to
// the spacing moves the boxes and makes a different guess go wrong, which is why the same slide broke ten times.
// Here nothing is derived: a group holds its columns, a column holds its cards in order, and the placement is one
// function of the metrics below.
//

import { type ContentMap } from '@dxos/diagram';

import { nodeKey } from '../../model/content.ts';
import { elementId } from '../../model/handler.ts';
import { TONES } from './studio.ts';

/** A card: its id, what it says and the glyph it says it with. */
export type SlideCard = {
  id: string;
  label: string;
  icon: string;
  /** An object type's colour, by the deck's own name (`event`, `message`, `file`, `trip`, `sheet`). */
  tone?: string;
};

/** A column of cards, stacked top to bottom. Every column is centred on the slide's axis, which is what makes the gaps equal. */
export type SlideColumn = readonly SlideCard[];

/** A group: a heading, an optional box, and the columns that stand side by side inside it. */
export type SlideGroup = {
  id: string;
  heading?: string;
  /** The group is drawn with a box around its columns. */
  box?: boolean;
  columns: readonly SlideColumn[];
};

/** An edge: the two cards it joins and what it says. The canvas routes it and carries the caption on the line. */
export type SlideEdge = { from: string; to: string; label?: string };

/** Every length the placement uses, in scene units; all multiples of the drawing's 8px grid. */
export type SlideMetrics = {
  cardWidth: number;
  cardHeight: number;
  /** Between cards down a column. */
  rowGap: number;
  /** Between columns inside one group. */
  columnGap: number;
  /** Between one group and the next. */
  groupGap: number;
  /** Inside a group's box, around its columns. */
  boxPadding: number;
  /** Between a group's heading and the top of its box. */
  headingGap: number;
  headingSize: number;
};

export const SLIDE_METRICS: SlideMetrics = {
  cardWidth: 224,
  cardHeight: 64,
  // Wide enough for an edge's caption to sit in the lane between two columns, and between two cards of one column,
  // rather than on the card next to it.
  rowGap: 32,
  columnGap: 160,
  groupGap: 128,
  boxPadding: 24,
  headingGap: 56,
  headingSize: 34,
};

export type SlideSpec = {
  id: string;
  title: string;
  groups: readonly SlideGroup[];
  edges?: readonly SlideEdge[];
  metrics?: Partial<SlideMetrics>;
};

type Box = { x: number; y: number; width: number; height: number };

/** Where every card, box and heading of the spec goes. Pure geometry: the same spec always lays out the same way. */
export type SlideLayout = {
  cards: ReadonlyMap<string, Box & { card: SlideCard }>;
  boxes: readonly (Box & { group: SlideGroup })[];
  headings: readonly (Box & { text: string })[];
};

const columnHeight = (column: SlideColumn, { cardHeight, rowGap }: SlideMetrics) =>
  column.length * cardHeight + (column.length - 1) * rowGap;

const groupWidth = (group: SlideGroup, { cardWidth, columnGap }: SlideMetrics) =>
  group.columns.length * cardWidth + (group.columns.length - 1) * columnGap;

/**
 * Lays the spec out: groups left to right, columns left to right inside each, cards top to bottom inside each column.
 * Every column is centred on one horizontal axis, so a column of one (Person) sits level with the middle of a column
 * of six without anything measuring anything.
 */
export const layoutSlide = (spec: SlideSpec): SlideLayout => {
  const metrics = { ...SLIDE_METRICS, ...spec.metrics };
  const { cardWidth, cardHeight, rowGap, columnGap, groupGap, boxPadding, headingGap, headingSize } = metrics;
  const cards = new Map<string, Box & { card: SlideCard }>();
  const boxes: (Box & { group: SlideGroup })[] = [];
  const headings: (Box & { text: string })[] = [];
  // The axis every column is centred on, and the box every group's own box is drawn around.
  const axis = 0;
  // ONE height for every box, taken from the longest column on the slide: a box drawn around its own group would be
  // a different height in each, while the cards inside keep the one gap between them.
  const tallest = Math.max(
    ...spec.groups.flatMap(({ columns }) => columns.map((column) => columnHeight(column, metrics))),
  );
  let left = 0;
  for (const group of spec.groups) {
    const width = groupWidth(group, metrics);
    group.columns.forEach((column, index) => {
      const lane = left + index * (cardWidth + columnGap);
      // Centred on the axis, so a short column sits in the middle of the height every box shares.
      let y = axis - columnHeight(column, metrics) / 2;
      for (const card of column) {
        cards.set(card.id, { x: lane, y, width: cardWidth, height: cardHeight, card });
        y += cardHeight + rowGap;
      }
    });
    if (group.box) {
      boxes.push({
        x: left - boxPadding,
        y: axis - tallest / 2 - boxPadding,
        width: width + 2 * boxPadding,
        height: tallest + 2 * boxPadding,
        group,
      });
    }
    if (group.heading) {
      headings.push({ x: left, y: 0, width, height: headingSize, text: group.heading });
    }
    left += width + groupGap;
  }
  // Every heading on ONE line, above the tallest group: a heading placed over its own group would step up and down
  // the slide as the columns change length, which is what put "Containers" above the other two.
  const ceiling = Math.min(...[...cards.values(), ...boxes].map(({ y }) => y));
  const line = ceiling - headingGap - headingSize;
  return { cards, boxes, headings: headings.map((heading) => ({ ...heading, y: line })) };
};

/** How many ports a card's side has; the studio kinds declare the same number ({@link cardSpec}). */
const PORTS_PER_SIDE = 5;

type Side = 'n' | 's' | 'e' | 'w';

/** Which side of each card an edge leaves and arrives on, by whichever axis separates the two further. */
const sides = (from: Box, to: Box): { source: Side; target: Side } => {
  const across = Math.max(to.x - (from.x + from.width), from.x - (to.x + to.width));
  const down = Math.max(to.y - (from.y + from.height), from.y - (to.y + to.height));
  if (down > across) {
    return to.y > from.y ? { source: 's', target: 'n' } : { source: 'n', target: 's' };
  }
  return to.x > from.x ? { source: 'e', target: 'w' } : { source: 'w', target: 'e' };
};

/**
 * The `count` port indices a side gives up, spread evenly and centred: one edge takes the middle, and several fan out
 * either side of it rather than stacking on one point — which is what piled five captions on Person's edge.
 */
const fan = (count: number): number[] => {
  if (count <= 1) {
    return [Math.ceil(PORTS_PER_SIDE / 2)];
  }
  const span = Math.min(count, PORTS_PER_SIDE);
  return Array.from({ length: count }, (_, index) => Math.round(1 + (index * (PORTS_PER_SIDE - 1)) / (span - 1)));
};

const boxId = (id: string) => elementId(id, 'box');

/** Seeds a canvas from a slide spec: one node per card, one rect per box and heading, one routed link per edge. */
export const seedSlideSpec =
  (spec: SlideSpec) =>
  (content: ContentMap, root: string): void => {
    const { headingSize } = { ...SLIDE_METRICS, ...spec.metrics };
    const { cards, boxes, headings } = layoutSlide(spec);
    for (const { group, ...box } of boxes) {
      content[nodeKey(elementId(group.id, 'frame'))] = {
        kind: 'node',
        scene: root,
        node: {
          type: 'rect',
          id: elementId(group.id, 'frame'),
          z: 'a0',
          center: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
          size: { width: box.width, height: box.height },
          style: { fill: false },
        },
      };
    }
    headings.forEach(({ text, ...box }, index) => {
      const id = elementId(`heading-${index}`, 'label');
      content[nodeKey(id)] = {
        kind: 'node',
        scene: root,
        node: {
          type: 'rect',
          id,
          z: 'a1',
          center: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
          size: { width: box.width, height: box.height },
          label: text,
          style: {
            fill: false,
            border: false,
            alignHorizontal: 'center',
            alignVertical: 'middle',
            fontSize: headingSize,
          },
        },
      };
    });
    for (const [id, { card, ...box }] of cards) {
      content[nodeKey(boxId(id))] = {
        kind: 'node',
        scene: root,
        node: {
          type: 'card',
          id: boxId(id),
          z: 'a1',
          center: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
          size: { width: box.width, height: box.height },
          label: card.label,
          icon: { type: card.icon },
          data: card.tone ? { tone: TONES[card.tone] ?? card.tone } : {},
        },
      };
    }
    // Two passes, because a port depends on every other edge meeting that side: first which sides each edge uses,
    // then the fan across each side, in the order the far ends stand along it.
    const edges = (spec.edges ?? []).map((edge) => {
      const source = cards.get(edge.from);
      const target = cards.get(edge.to);
      if (!source || !target) {
        throw new Error(`${spec.id}: edge ${edge.from} → ${edge.to} names a card the slide does not draw.`);
      }
      return { ...edge, source, target, sides: sides(source, target) };
    });
    const ports = new Map<string, string>();
    const bySide = new Map<string, { key: string; along: number }[]>();
    for (const edge of edges) {
      const place = (node: string, side: Side, self: Box, other: Box, key: string) => {
        const along = side === 'n' || side === 's' ? other.x + other.width / 2 : other.y + other.height / 2;
        bySide.set(`${node}/${side}`, [...(bySide.get(`${node}/${side}`) ?? []), { key, along }]);
      };
      place(edge.from, edge.sides.source, edge.source, edge.target, `${edge.from}-${edge.to}/source`);
      place(edge.to, edge.sides.target, edge.target, edge.source, `${edge.from}-${edge.to}/target`);
    }
    for (const [node, ends] of bySide) {
      const side = node.slice(-1) as Side;
      const order = [...ends].sort((left, right) => left.along - right.along);
      fan(order.length).forEach((index, at) => ports.set(order[at].key, `${side}${index}`));
    }
    for (const { from, to, label } of edges) {
      const id = `${from}-${to}`;
      content[`link:${id}`] = {
        kind: 'link',
        scene: root,
        link: {
          type: 'line',
          id,
          z: 'a2',
          source: { node: boxId(from), port: ports.get(`${id}/source`) },
          target: { node: boxId(to), port: ports.get(`${id}/target`) },
          ends: { end: 'arrow' },
          ...(label ? { text: label } : {}),
        },
      };
    }
  };

/** What the spec covers, which is what a view has to frame. */
export const slideBounds = (spec: SlideSpec): Box => {
  const { cards, boxes, headings } = layoutSlide(spec);
  const all: Box[] = [...[...cards.values()], ...boxes, ...headings];
  const x = Math.min(...all.map((box) => box.x));
  const y = Math.min(...all.map((box) => box.y));
  return {
    x,
    y,
    width: Math.max(...all.map((box) => box.x + box.width)) - x,
    height: Math.max(...all.map((box) => box.y + box.height)) - y,
  };
};
