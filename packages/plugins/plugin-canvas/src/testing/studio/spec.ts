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
import { FAT_ARROW, TONES } from './studio.ts';

/** A card: its id, what it says and the glyph it says it with. */
export type SlideCard = {
  id: string;
  label: string;
  icon: string;
  /** An object type's colour, by the deck's own name (`event`, `message`, `file`, `trip`, `sheet`). */
  tone?: string;
  /** What the card says under its title. A card that has one is drawn at the slide's `bodyCardHeight`. */
  body?: string;
  /** The mono line under the body: where the thing lives, what it costs, how many there are. */
  footer?: string;
  /** `simple` is the deck's one-row card: glyph, title, and the footer indented under the title with no rule. */
  variant?: 'simple';
  /** The card kind that draws it; `card` unless the slide says otherwise (the Agents slide's `feed-card`). */
  kind?: string;
  /** A feed card's strip: how many blocks it has, what the strip is called, and which blocks are marked. */
  feed?: { blocks: number; label?: string; marks?: readonly number[] };
  /** A row of pills in place of a body, as the ECHO slide's types banner holds. */
  chips?: {
    items: readonly { icon: string; label: string; note?: string }[];
    cols?: number;
    flat?: boolean;
  };
};

/**
 * A component in a column where a card would stand: the plank, substrate, space graph and app frame the deck draws,
 * which have their own box and their own fields rather than a title and a glyph.
 */
export type SlideComponent = {
  id: string;
  /** The element kind the host has registered (`plank`, `substrate`, `space-graph`, `app-frame`). */
  component: string;
  /** The kind's own fields, written under `data` (decision 21). */
  data?: Record<string, unknown>;
  /** The heading a plank draws, which is the core base's `label` rather than one of the kind's fields. */
  label?: string;
  width?: number;
  height?: number;
};

/**
 * A plain shape where a card would stand: the deck's fat arrows, which say there are more services above and below
 * the ten the slide has room for.
 */
export type SlideShape = { id: string; shape: 'fat-arrow'; up?: boolean; width?: number; height?: number };

export type SlideCell = SlideCard | SlideComponent | SlideShape;

/** Whether a cell draws through an element kind of its own rather than as a card. */
export const isComponent = (cell: SlideCell): cell is SlideComponent => 'component' in cell;

export const isShape = (cell: SlideCell): cell is SlideShape => 'shape' in cell;

/**
 * A column of cells, stacked top to bottom. Every column is centred on the slide's axis, which is what makes the gaps
 * equal; a column is as wide as its widest cell, so a component stands in a lane of its own size.
 */
export type SlideColumn = readonly SlideCell[];

/** A group: a heading, an optional box, and the columns that stand side by side inside it. */
export type SlideGroup = {
  id: string;
  heading?: string;
  /** The group is drawn with a box around its columns. */
  box?: boolean;
  /**
   * A card above the columns that all of them hang from: one trunk leaves its bottom middle port and lands on the
   * top middle of each column's first card. It is drawn larger than a card, since it is their parent rather than one
   * of them.
   */
  header?: SlideCard;
  /** A card the width of the group above its columns, with no trunks: what the columns under it are all about. */
  banner?: SlideCard;
  columns: readonly SlideColumn[];
};

/** An edge: the two cards it joins and what it says. The canvas routes it and carries the caption on the line. */
export type SlideEdge = {
  from: string;
  to: string;
  label?: string;
  /** A reader's tap rather than a relation: dashed, and with no arrowhead. */
  tap?: boolean;
};

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
  /** A group header's own box, and the room left under it for the trunk. */
  headerWidth: number;
  headerHeight: number;
  headerGap: number;
  /** Between one band and the next, and the column a band's own name stands in. */
  bandGap: number;
  bandLabelWidth: number;
  bandLabelGap: number;
  /** A card that carries a body is this tall rather than `cardHeight`; a banner takes `bannerHeight`. */
  bodyCardHeight: number;
  bannerHeight: number;
  bannerGap: number;
  /** The slide's own footnote: how far under the content it sits, and how large. */
  noteGap: number;
  noteSize: number;
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
  // Half as wide again as a card, which is what reads as their parent rather than as one more of them.
  headerWidth: 336,
  headerHeight: 112,
  headerGap: 96,
  bandGap: 96,
  bandLabelWidth: 288,
  bandLabelGap: 48,
  bodyCardHeight: 200,
  bannerHeight: 176,
  bannerGap: 64,
  noteGap: 64,
  noteSize: 18,
};

/**
 * A band: a row of the slide, holding one cell per column. Where groups divide a slide left to right, bands divide
 * it top to bottom, and the two together make a grid — which is what the Agent slide is.
 */
export type SlideBand = {
  id: string;
  /** Named to the left of the row, since a band's columns are already the slide's. */
  label?: string;
  box?: boolean;
  columns: readonly SlideColumn[];
};

export type SlideSpec = {
  id: string;
  title: string;
  /** Columns side by side. A slide declares these or {@link bands}, never both. */
  groups?: readonly SlideGroup[];
  /** Rows stacked down the slide, their columns aligned. */
  bands?: readonly SlideBand[];
  /** A line under the whole slide: what the numbers on it are counted from, what it leaves out. */
  note?: string;
  edges?: readonly SlideEdge[];
  metrics?: Partial<SlideMetrics>;
};

type Box = { x: number; y: number; width: number; height: number };

/** Where every card, box and heading of the spec goes. Pure geometry: the same spec always lays out the same way. */
export type SlideLayout = {
  cards: ReadonlyMap<string, Box & { card: SlideCell }>;
  /** The trunks a group's header makes: its card and the first card of each of that group's columns. */
  trunks: readonly { from: string; to: string }[];
  boxes: readonly (Box & { id: string })[];
  headings: readonly (Box & { text: string; align?: 'center' | 'right' | 'left'; size?: number })[];
};

const heightOf = (cell: SlideCell, { cardHeight, bodyCardHeight }: SlideMetrics): number => {
  if (isComponent(cell) || isShape(cell)) {
    return cell.height ?? cardHeight;
  }
  // A `simple` card is one row whatever it carries; a body or a block of chips is what needs the room.
  return cell.variant !== 'simple' && (cell.body !== undefined || cell.chips !== undefined)
    ? bodyCardHeight
    : cardHeight;
};

const widthOf = (cell: SlideCell, { cardWidth }: SlideMetrics): number =>
  isComponent(cell) || isShape(cell) ? (cell.width ?? cardWidth) : cardWidth;

const columnHeight = (column: SlideColumn, metrics: SlideMetrics) =>
  column.reduce((total, cell) => total + heightOf(cell, metrics), 0) + (column.length - 1) * metrics.rowGap;

/** A column is as wide as its widest cell, so a component does not have to fit a card's lane. */
const columnWidth = (column: SlideColumn, metrics: SlideMetrics) =>
  Math.max(metrics.cardWidth, ...column.map((cell) => widthOf(cell, metrics)));

const groupWidth = (group: SlideGroup, metrics: SlideMetrics) =>
  group.columns.reduce((total, column) => total + columnWidth(column, metrics), 0) +
  (group.columns.length - 1) * metrics.columnGap;

/**
 * Lays the spec out: groups left to right, columns left to right inside each, cards top to bottom inside each column.
 * Every column is centred on one horizontal axis, so a column of one (Person) sits level with the middle of a column
 * of six without anything measuring anything.
 */
/**
 * Bands: rows down the slide, their columns on one pitch so a cell lines up with the cell above it. Each band is as
 * tall as its own longest cell, and its cards sit centred in it.
 */
const layoutBands = (bands: readonly SlideBand[], metrics: SlideMetrics): SlideLayout => {
  const { cardWidth, cardHeight, rowGap, columnGap, boxPadding, bandGap, bandLabelWidth, bandLabelGap } = metrics;
  const { headingSize } = metrics;
  const cards = new Map<string, Box & { card: SlideCell }>();
  const boxes: (Box & { id: string })[] = [];
  const headings: (Box & { text: string; align?: 'center' | 'right' | 'left'; size?: number })[] = [];
  const lanes = Math.max(...bands.map(({ columns }) => columns.length));
  const width = lanes * cardWidth + (lanes - 1) * columnGap;
  let top = 0;
  for (const band of bands) {
    const tallest = Math.max(...band.columns.map((column) => columnHeight(column, metrics)));
    band.columns.forEach((column, index) => {
      const lane = index * (cardWidth + columnGap);
      // Centred in the band, so a cell of one card sits level with the middle of a cell of two.
      let y = top + (tallest - columnHeight(column, metrics)) / 2;
      for (const card of column) {
        const [cellWidth, height] = [widthOf(card, metrics), heightOf(card, metrics)];
        cards.set(card.id, { x: lane + (cardWidth - cellWidth) / 2, y, width: cellWidth, height, card });
        y += height + rowGap;
      }
    });
    if (band.box) {
      boxes.push({
        x: -boxPadding,
        y: top - boxPadding,
        width: width + 2 * boxPadding,
        height: tallest + 2 * boxPadding,
        id: band.id,
      });
    }
    if (band.label) {
      // To the left of the row and against it, since the columns are the slide's rather than this band's.
      headings.push({
        x: -boxPadding - bandLabelGap - bandLabelWidth,
        y: top + (tallest - headingSize) / 2,
        width: bandLabelWidth,
        height: headingSize,
        text: band.label,
        align: 'right',
      });
    }
    top += tallest + bandGap;
  }
  return { cards, boxes, trunks: [], headings };
};

export const layoutSlide = (spec: SlideSpec): SlideLayout => {
  const metrics = { ...SLIDE_METRICS, ...spec.metrics };
  if (spec.bands) {
    return layoutBands(spec.bands, metrics);
  }
  const groups = spec.groups ?? [];
  const { cardWidth, cardHeight, rowGap, columnGap, groupGap, boxPadding, headingGap, headingSize } = metrics;
  const { headerWidth, headerHeight, headerGap, bannerHeight, bannerGap, noteGap, noteSize } = metrics;
  const cards = new Map<string, Box & { card: SlideCell }>();
  const trunks: { from: string; to: string }[] = [];
  const boxes: (Box & { id: string })[] = [];
  const headings: (Box & { text: string; align?: 'center' | 'right' | 'left'; size?: number })[] = [];
  // The axis every column is centred on, and the box every group's own box is drawn around.
  const axis = 0;
  // ONE height for every box, taken from the longest column on the slide: a box drawn around its own group would be
  // a different height in each, while the cards inside keep the one gap between them.
  const tallest = Math.max(...groups.flatMap(({ columns }) => columns.map((column) => columnHeight(column, metrics))));
  let left = 0;
  for (const group of groups) {
    const width = groupWidth(group, metrics);
    let lane = left;
    for (const column of group.columns) {
      const laneWidth = columnWidth(column, metrics);
      // Centred on the axis, so a short column sits in the middle of the height every box shares.
      let y = axis - columnHeight(column, metrics) / 2;
      for (const card of column) {
        const [cellWidth, height] = [widthOf(card, metrics), heightOf(card, metrics)];
        // Centred in its lane, so a card still lines up with the column a wider component stands in.
        cards.set(card.id, { x: lane + (laneWidth - cellWidth) / 2, y, width: cellWidth, height, card });
        y += height + rowGap;
      }
      lane += laneWidth + columnGap;
    }
    if (group.banner) {
      cards.set(group.banner.id, {
        x: left,
        y: axis - tallest / 2 - bannerGap - bannerHeight,
        width,
        height: bannerHeight,
        card: group.banner,
      });
    }
    if (group.header) {
      // Above the columns, centred on the group, with the gap under it the trunk runs through.
      cards.set(group.header.id, {
        x: left + (width - headerWidth) / 2,
        y: axis - tallest / 2 - headerGap - headerHeight,
        width: headerWidth,
        height: headerHeight,
        card: group.header,
      });
      for (const column of group.columns) {
        const first = column[0];
        if (first) {
          trunks.push({ from: group.header.id, to: first.id });
        }
      }
    }
    if (group.box) {
      boxes.push({
        x: left - boxPadding,
        y: axis - tallest / 2 - boxPadding,
        width: width + 2 * boxPadding,
        height: tallest + 2 * boxPadding,
        id: group.id,
      });
    }
    if (group.heading) {
      headings.push({ x: left, y: 0, width, height: headingSize, text: group.heading });
    }
    left += width + groupGap;
  }
  // Every heading on ONE line, above the tallest group: a heading placed over its own group would step up and down
  // the slide as the columns change length, which is what put "Containers" above the other two.
  // Every heading on ONE line, taken from the tops of the COLUMNS rather than of everything drawn: a banner stands
  // above its columns, and measuring from it would strand the other groups' headings at the slide's ceiling.
  const top = axis - tallest / 2 - (spec.groups?.some(({ box }) => box) ? boxPadding : 0);
  const placed = headings.map((heading) => ({ ...heading, y: top - headingGap - headingSize }));
  if (spec.note) {
    // Under everything the slide draws, on its own left edge, as the deck's footnotes sit.
    const all = [...cards.values(), ...boxes];
    const left = Math.min(...all.map(({ x }) => x));
    const right = Math.max(...all.map(({ x, width }) => x + width));
    const bottom = Math.max(...all.map(({ y, height }) => y + height));
    placed.push({
      x: left,
      y: bottom + noteGap,
      width: right - left,
      height: noteSize * 1.6,
      text: spec.note,
      align: 'left',
      size: noteSize,
    });
  }
  return { cards, boxes, trunks, headings: placed };
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
  // Clamped, because more edges can meet a side than it has ports: past five they double up on the outer ones
  // rather than naming an `e6` the card does not have.
  const span = Math.min(count, PORTS_PER_SIDE);
  return Array.from({ length: count }, (_, index) =>
    Math.min(PORTS_PER_SIDE, Math.round(1 + (Math.min(index, span - 1) * (PORTS_PER_SIDE - 1)) / (span - 1))),
  );
};

const boxId = (id: string) => elementId(id, 'box');

/** Seeds a canvas from a slide spec: one node per card, one rect per box and heading, one routed link per edge. */
export const seedSlideSpec =
  (spec: SlideSpec) =>
  (content: ContentMap, root: string): void => {
    const { headingSize } = { ...SLIDE_METRICS, ...spec.metrics };
    const { cards, boxes, trunks, headings } = layoutSlide(spec);
    for (const { id: boxId_, ...box } of boxes) {
      content[nodeKey(elementId(boxId_, 'frame'))] = {
        kind: 'node',
        scene: root,
        node: {
          type: 'rect',
          id: elementId(boxId_, 'frame'),
          z: 'a0',
          center: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
          size: { width: box.width, height: box.height },
          style: { fill: false },
        },
      };
    }
    headings.forEach(({ text, align, size, ...box }, index) => {
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
            alignHorizontal: align ?? 'center',
            alignVertical: 'middle',
            fontSize: size ?? headingSize,
          },
        },
      };
    });
    for (const [id, { card, ...box }] of cards) {
      const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      const size = { width: box.width, height: box.height };
      if (isShape(card)) {
        // Muted and half transparent, as the deck draws it: a hint that the column runs on, not a connector.
        content[nodeKey(boxId(id))] = {
          kind: 'node',
          scene: root,
          node: {
            type: 'polyline',
            id: boxId(id),
            z: 'a1',
            center,
            size,
            points: card.up === false ? FAT_ARROW.map(({ x, y }) => ({ x, y: 1 - y })) : FAT_ARROW,
            params: { closed: true },
            style: { hue: 'neutral', fill: true, border: false, opacity: 0.45 },
          },
        };
        continue;
      }
      if (isComponent(card)) {
        // A component draws through its own kind, so all it takes here is its box, its heading and its fields.
        content[nodeKey(boxId(id))] = {
          kind: 'node',
          scene: root,
          node: {
            type: card.component,
            id: boxId(id),
            z: 'a1',
            center,
            size,
            ...(card.label !== undefined ? { label: card.label } : {}),
            data: card.data ?? {},
          },
        };
        continue;
      }
      content[nodeKey(boxId(id))] = {
        kind: 'node',
        scene: root,
        node: {
          type: card.kind ?? 'card',
          id: boxId(id),
          z: 'a1',
          center,
          size,
          label: card.label,
          icon: { type: card.icon },
          // The core card's own fields stay at the top; the kind's go under `data` (decision 21).
          ...(card.body !== undefined ? { body: card.body } : {}),
          ...(card.footer !== undefined ? { footer: card.footer } : {}),
          data: {
            ...(card.tone ? { tone: TONES[card.tone] ?? card.tone } : {}),
            ...(card.variant ? { variant: card.variant } : {}),
            ...(card.feed
              ? {
                  feed: card.feed.blocks,
                  marks: card.feed.marks ?? [],
                  ...(card.feed.label ? { feedLabel: card.feed.label } : {}),
                }
              : {}),
            ...(card.chips
              ? {
                  chips: {
                    items: card.chips.items.map(({ icon, label, note }) => ({
                      icon,
                      label,
                      ...(note ? { note } : {}),
                    })),
                    ...(card.chips.cols !== undefined ? { cols: card.chips.cols } : {}),
                    ...(card.chips.flat !== undefined ? { flat: card.chips.flat } : {}),
                  },
                }
              : {}),
          },
        },
      };
    }
    // Two passes, because a port depends on every other edge meeting that side: first which sides each edge uses,
    // then the fan across each side, in the order the far ends stand along it.
    const declared: (SlideEdge & { trunk?: boolean })[] = [
      ...trunks.map((trunk) => ({ ...trunk, trunk: true })),
      ...(spec.edges ?? []),
    ];
    const edges = declared.map((edge) => {
      const source = cards.get(edge.from);
      const target = cards.get(edge.to);
      if (!source || !target) {
        throw new Error(`${spec.id}: edge ${edge.from} → ${edge.to} names a card the slide does not draw.`);
      }
      const trunk = edge.trunk === true;
      // A trunk always leaves the foot and lands on the head, whatever the two cards' separation says: the header
      // hangs its columns below it, so an outer column taking the east or west port would leave the fan lopsided.
      return {
        ...edge,
        source,
        target,
        sides: trunk ? ({ source: 's', target: 'n' } as const) : sides(source, target),
        trunk,
      };
    });
    const ports = new Map<string, string>();
    const bySide = new Map<string, { key: string; along: number }[]>();
    const MIDDLE = Math.ceil(PORTS_PER_SIDE / 2);
    for (const edge of edges) {
      // A trunk leaves its source's middle port whatever else meets that side, which is what makes one wire fan out
      // rather than five wires leave five points.
      if (edge.trunk) {
        ports.set(`${edge.from}-${edge.to}/source`, `${edge.sides.source}${MIDDLE}`);
      }
      const place = (node: string, side: Side, self: Box, other: Box, key: string) => {
        const along = side === 'n' || side === 's' ? other.x + other.width / 2 : other.y + other.height / 2;
        bySide.set(`${node}/${side}`, [...(bySide.get(`${node}/${side}`) ?? []), { key, along }]);
      };
      if (!edge.trunk) {
        place(edge.from, edge.sides.source, edge.source, edge.target, `${edge.from}-${edge.to}/source`);
      }
      place(edge.to, edge.sides.target, edge.target, edge.source, `${edge.from}-${edge.to}/target`);
    }
    for (const [node, ends] of bySide) {
      const side = node.slice(-1) as Side;
      const order = [...ends].sort((left, right) => left.along - right.along);
      fan(order.length).forEach((index, at) => ports.set(order[at].key, `${side}${index}`));
    }
    for (const { from, to, label, tap } of edges) {
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
          ends: tap ? {} : { end: 'arrow' },
          ...(tap ? { style: { lineStyle: 'dashed' as const } } : {}),
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
