//
// Copyright 2026 DXOS.org
//

import { type Node, type View, initialKeys } from '@dxos/react-ui-canvas/scene';
import { type RectNode } from '@dxos/scene';

import { type Point } from './molecule.ts';

/** An axis-aligned rectangle by its top-left corner, in scene units. */
export type Rect = { x: number; y: number; width: number; height: number };

/**
 * The hexagonal lattice a block's molecules settle onto: axial site (0, 0) sits at `origin`, neighbours are `spacing`
 * apart, and a site is usable while its atom fits inside `bounds` (and, for a round well, within `radius` of `origin`).
 */
export type HexGrid = {
  origin: Point;
  spacing: number;
  bounds: Rect;
  radius?: number;
};

/** A labelled block: its frame, and the well inside it where molecules live. */
export type Block = {
  id: string;
  label: string;
  frame: Rect;
  well: Rect;
  /** A round block is drawn as the circle inscribed in its frame and well. */
  round?: boolean;
  /** A sink that is an application: its well shows the app's content rather than a lattice of molecules. */
  app?: AppKind;
  /** A block that takes no part in the diagram (the silos have no hub), so nothing draws it. */
  hidden?: boolean;
  /** A container around other blocks: drawn as a labelled frame with no well of its own. */
  group?: boolean;
  /** A well split into partitions: each bucket is its own white well, and its own lattice. */
  buckets?: readonly Rect[];
  /**
   * For a partitioned well, the unseen horizontal channels above and below its buckets (their centre lines' heights)
   * that molecules run along between the vertical channels and the buckets; `left`..`right` is their extent, `width`
   * their thickness.
   */
  lanes?: { top: number; bottom: number; left: number; right: number; width: number };
};

/** The applications a sink can be, each drawn as a simplified view of its content. */
export type AppKind = 'document' | 'spreadsheet' | 'kanban' | 'list' | 'messaging';

/** A straight channel between two blocks that molecules flow along, mostly towards the hub. */
export type Channel = {
  id: string;
  hue: string;
  /** Centre of the channel's end at the outer block (a source, or the hub for a sink's channel). */
  from: Point;
  /** Centre of the channel's end at the inner block. */
  to: Point;
  width: number;
};

export type SourceSpec = { id: string; label: string; hue: string };

/** What one side of an extended diagram adds, inner first. */
export type Extension = {
  sources?: readonly SourceSpec[];
  sinks?: readonly { label: string; app?: AppKind }[];
  buckets?: number;
};

/**
 * `stacked`: the sources in a row above a wide hub, and the sinks (agents) below it; `radial`: the sources spread around
 * a round hub, with no sinks; `silos`: each source joined straight to its own application below it, with no hub.
 */
export type DataFlowVariant = 'stacked' | 'radial' | 'silos';

export type DataFlowSpec = {
  variant?: DataFlowVariant;
  sources: readonly SourceSpec[];
  /** `partitions` splits the hub's well into that many visible buckets; one lays it out partitioned, ready to split. */
  hub: { label: string; partitions?: number };
  /** The stacked variant's sinks (agents or applications), side by side under the hub; the radial variant has none. */
  sinks?: readonly { label: string; app?: AppKind }[];
  /** Scene units between neighbouring lattice sites. */
  spacing?: number;
  /** The label of the monolithic variant's box above the agent, where the molecules it reads appear. */
  feed?: { label: string };
  /**
   * More of a stacked diagram beyond its edges: sources, sinks (agents) and buckets added outward on either side, at the
   * same pitch, with the hub stretched to hold them; everything already laid out stays exactly where it was.
   */
  extend?: { left?: Extension; right?: Extension };
  /** Draws only the hub and what has landed in it, for looking at the hub's container on its own. */
  focus?: 'hub';
  /**
   * The silos with one monolithic agent that reads every source at once: the hub, drawn as a peer of the applications
   * at the end of their row, fed by one channel from a container around all the sources.
   */
  monolith?: boolean;
};

export type SourceBlock = Block & { hue: string; grid: HexGrid };

export type DataFlowLayout = {
  /** Each source with the hex grid its molecules form on. */
  sources: readonly SourceBlock[];
  hub: Block;
  sinks: readonly Block[];
  /** One channel per source into the hub (in source order), then one from the hub into each sink (in sink order). */
  channels: readonly Channel[];
  hubGrid: HexGrid;
  sinkGrids: readonly HexGrid[];
  /** Only the hub is drawn (the other blocks still work, unseen). */
  focus?: 'hub';
  /** The silos: sink `i` is source `i`'s own application, joined by channel `i`; the hub is hidden unless monolithic. */
  silos?: boolean;
  /**
   * In the silos, the monolithic agent's feed: `group` spans every source and the agent's column; molecules for the
   * agent appear in `feed`, the box in the agent's column of the sources' row, and drop down channel `down` into the
   * agent.
   */
  monolith?: { group: Block; feed: Block; down: number };
};

/** Multiples of the canvas's 64px major grid, so the blocks sit on it. */
const SOURCE_SIZE = { width: 192, height: 192 };
const SINK_SIZE = { width: 384, height: 256 };
const SMALL_SINK_SIZE = { width: 256, height: 256 };
const NARROW_SINK_SIZE = { width: 192, height: 256 };
/** The silos' applications, as wide as their sources, and the longer channels joining each pair. */
const SILO_APP_SIZE = { width: 192, height: 256 };
const SILO_CHANNEL_HEIGHT = 192;
/** The padding of the container around the sources. */
const GROUP_INSET = 24;
const HUB_HEIGHT = 320;
const GAP = 64;
const CHANNEL_HEIGHT = 128;
const CHANNEL_WIDTH = 80;
/** Room for the block's title above its well. */
const TITLE_INSET = 48;
const WELL_INSET = 16;
export const DEFAULT_SPACING = 20;
/** Room between the outermost atoms and the well's edge. */
const GRID_MARGIN = 10;

/** The radial variant's round hub (its frame's radius) and the distance from its centre to each source's centre. */
const HUB_RADIUS = 288;
const ORBIT_RADIUS = 576;

/** The well inside `frame`: below the title strip, or, for a block with no label, inset alike on every side. */
const wellOf = (frame: Rect, titled = true): Rect => {
  const top = titled ? TITLE_INSET : WELL_INSET;
  return {
    x: frame.x + WELL_INSET,
    y: frame.y + top,
    width: frame.width - 2 * WELL_INSET,
    height: frame.height - top - WELL_INSET,
  };
};

/** Gray frame left between a partitioned well's buckets. */
const BUCKET_GAP = 12;

/** Thickness of a partitioned hub's horizontal channels, and the frame between each and the buckets. */
const LANE_WIDTH = 40;
const LANE_GAP = 8;

/** A partitioned hub is taller, to keep its buckets roomy beside its horizontal channels. */
const PARTITIONED_HUB_HEIGHT = 416;

/** `region` split side by side into `count` buckets with frame between them. */
const bucketsOf = (region: Rect, count: number): Rect[] => {
  const width = (region.width - (count - 1) * BUCKET_GAP) / count;
  return Array.from({ length: count }, (_, index) => ({
    x: region.x + index * (width + BUCKET_GAP),
    y: region.y,
    width,
    height: region.height,
  }));
};

/** A hub in `frame` whose well holds a horizontal channel along its top and bottom with `count` buckets between them. */
const partitionedBlock = (id: string, label: string, frame: Rect, count: number): Block => {
  const well = wellOf(frame, label !== '');
  return {
    id,
    label,
    frame,
    well,
    buckets: bucketsOf(
      {
        x: well.x,
        y: well.y + LANE_WIDTH + LANE_GAP,
        width: well.width,
        height: well.height - 2 * (LANE_WIDTH + LANE_GAP),
      },
      count,
    ),
    lanes: {
      top: well.y + LANE_WIDTH / 2,
      bottom: well.y + well.height - LANE_WIDTH / 2,
      left: well.x,
      right: well.x + well.width,
      width: LANE_WIDTH,
    },
  };
};

/** `hub` cut into `count` buckets in place: as wide as it was, as tall as a partitioned hub, its top where it was. */
export const partitionHub = (hub: Block, count: number): Block =>
  partitionedBlock(hub.id, hub.label, { ...hub.frame, height: PARTITIONED_HUB_HEIGHT }, count);

/**
 * The lattice of each of a well's buckets, inset as a grid is: its sites must fall inside one of them. The margins
 * plus the gap keep neighbouring buckets more than a lattice step apart, so no molecule (its atoms joined by single
 * steps) can straddle two.
 */
export const regionsOf = (buckets: readonly Rect[]): Rect[] =>
  buckets.map((bucket) => ({
    x: bucket.x + GRID_MARGIN,
    y: bucket.y + GRID_MARGIN,
    width: bucket.width - 2 * GRID_MARGIN,
    height: bucket.height - 2 * GRID_MARGIN,
  }));

/** The well's lattice, centred in it; a round well's lattice stays inside its circle. */
export const gridOf = (well: Rect, spacing: number, round = false): HexGrid => ({
  origin: { x: well.x + well.width / 2, y: well.y + well.height / 2 },
  spacing,
  bounds: {
    x: well.x + GRID_MARGIN,
    y: well.y + GRID_MARGIN,
    width: well.width - 2 * GRID_MARGIN,
    height: well.height - 2 * GRID_MARGIN,
  },
  ...(round && { radius: Math.min(well.width, well.height) / 2 - GRID_MARGIN }),
});

const sourceBlock = (source: SourceSpec, frame: Rect, spacing: number): SourceBlock => {
  const well = wellOf(frame);
  return { ...source, frame, well, grid: gridOf(well, spacing) };
};

/** Lays out the diagram for its variant. */
export const layoutDataFlow = (spec: DataFlowSpec): DataFlowLayout => {
  const layout =
    spec.variant === 'radial'
      ? layoutRadial(spec)
      : spec.variant === 'silos'
        ? layoutSilos(spec)
        : spec.extend
          ? extendStacked(layoutStacked(spec), spec.extend, spec.spacing ?? DEFAULT_SPACING)
          : layoutStacked(spec);
  return spec.focus ? { ...layout, focus: spec.focus } : layout;
};

/** Each source above its own application, joined by a channel of its own; no hub between them. */
const layoutSilos = (spec: DataFlowSpec): DataFlowLayout => {
  const spacing = spec.spacing ?? DEFAULT_SPACING;
  const sources = spec.sources.map((source, index) =>
    sourceBlock(source, { x: index * (SOURCE_SIZE.width + GAP), y: 0, ...SOURCE_SIZE }, spacing),
  );
  const sinks = (spec.sinks ?? []).slice(0, sources.length).map((sink, index) => {
    const frame = {
      x: sources[index].frame.x,
      y: SOURCE_SIZE.height + SILO_CHANNEL_HEIGHT,
      ...SILO_APP_SIZE,
    };
    return { id: `sink-${index}`, label: sink.label, frame, well: wellOf(frame), app: sink.app };
  });
  const channels: Channel[] = sinks.map((sink, index) => {
    const source = sources[index];
    const x = source.frame.x + source.frame.width / 2;
    return {
      id: `channel-${source.id}`,
      hue: source.hue,
      from: { x, y: source.frame.y + source.frame.height },
      to: { x, y: sink.frame.y },
      width: CHANNEL_WIDTH,
    };
  });
  const empty = { x: 0, y: 0, width: 0, height: 0 };
  if (spec.monolith) {
    // The agent is one more box at the end of the applications' row, fed from a container around all the sources.
    const frame = {
      x: sources.length * (SOURCE_SIZE.width + GAP),
      y: SOURCE_SIZE.height + SILO_CHANNEL_HEIGHT,
      ...SILO_APP_SIZE,
    };
    const hub = { id: 'hub', label: spec.hub.label, frame, well: wellOf(frame) };
    // As wide as the sources and the agent's column together, so the agent's channel drops straight out of it.
    const row = (sources.length + 1) * SOURCE_SIZE.width + sources.length * GAP;
    const groupFrame = {
      x: -GROUP_INSET,
      y: -GROUP_INSET,
      width: row + 2 * GROUP_INSET,
      height: SOURCE_SIZE.height + 2 * GROUP_INSET,
    };
    const group = {
      id: 'databases',
      // Unlabelled: the feed box above the agent names what the container stands for.
      label: '',
      frame: groupFrame,
      well: groupFrame,
      group: true,
    };
    // A box like the sources', above the agent: what the agent reads appears in it before dropping down its channel.
    const feedFrame = { x: frame.x, y: 0, ...SOURCE_SIZE };
    const feed = { id: 'feed', label: spec.feed?.label ?? 'OAuth', frame: feedFrame, well: wellOf(feedFrame) };
    const x = frame.x + frame.width / 2;
    const down = channels.length;
    channels.push({
      id: 'channel-agent',
      hue: 'neutral',
      from: { x, y: feedFrame.y + feedFrame.height },
      to: { x, y: frame.y },
      width: CHANNEL_WIDTH,
    });
    return {
      sources,
      hub,
      sinks,
      channels,
      hubGrid: gridOf(hub.well, spacing),
      sinkGrids: sinks.map((sink) => gridOf(sink.well, spacing)),
      silos: true,
      monolith: { group, feed, down },
    };
  }

  // The silos have no hub; an empty one stands in, hidden, so code written for a hub has something to hold.
  const hub = { id: 'hub', label: spec.hub.label, frame: empty, well: empty, hidden: true };
  return {
    sources,
    hub,
    sinks,
    channels,
    hubGrid: gridOf(sources[0]?.well ?? empty, spacing),
    sinkGrids: sinks.map((sink) => gridOf(sink.well, spacing)),
    silos: true,
  };
};

/** The sources in a row, the hub spanning them below, and the sinks centred side by side under the hub. */
const layoutStacked = (spec: DataFlowSpec): DataFlowLayout => {
  const count = spec.sources.length;
  const sourceRow = count * SOURCE_SIZE.width + (count - 1) * GAP;
  const spacing = spec.spacing ?? DEFAULT_SPACING;
  // A lone sink is wide; several share the width under the hub.
  const sinkSpecs = spec.sinks ?? [];
  const size = sinkSpecs.length > 3 ? NARROW_SINK_SIZE : sinkSpecs.length > 1 ? SMALL_SINK_SIZE : SINK_SIZE;
  const row = sinkSpecs.length * size.width + Math.max(0, sinkSpecs.length - 1) * GAP;
  // Every row is centred on x = 0, and the hub spans the wider of the two, so a diagram that gains sources or sinks
  // grows outward evenly from where it was.
  const width = Math.max(sourceRow, row);
  const sources = spec.sources.map((source, index) =>
    sourceBlock(source, { x: -sourceRow / 2 + index * (SOURCE_SIZE.width + GAP), y: 0, ...SOURCE_SIZE }, spacing),
  );

  // Set at all (even to one), the hub is laid out partitioned: as tall, with its lanes, so it can split in place later.
  const partitions = spec.hub.partitions;
  const hubFrame = {
    x: -width / 2,
    y: SOURCE_SIZE.height + CHANNEL_HEIGHT,
    width,
    height: partitions ? PARTITIONED_HUB_HEIGHT : HUB_HEIGHT,
  };
  const hub = partitions
    ? partitionedBlock('hub', spec.hub.label, hubFrame, partitions)
    : { id: 'hub', label: spec.hub.label, frame: hubFrame, well: wellOf(hubFrame, spec.hub.label !== '') };

  const channels: Channel[] = sources.map((source) => ({
    id: `channel-${source.id}`,
    hue: source.hue,
    from: { x: source.frame.x + source.frame.width / 2, y: source.frame.y + source.frame.height },
    to: { x: source.frame.x + source.frame.width / 2, y: hubFrame.y },
    width: CHANNEL_WIDTH,
  }));

  const sinks = sinkSpecs.map((sink, index) => {
    const frame = {
      x: -row / 2 + index * (size.width + GAP),
      y: hubFrame.y + hubFrame.height + CHANNEL_HEIGHT,
      ...size,
    };
    return { id: `sink-${index}`, label: sink.label, frame, well: wellOf(frame), app: sink.app };
  });
  for (const sink of sinks) {
    const x = sink.frame.x + sink.frame.width / 2;
    channels.push({
      id: `channel-${sink.id}`,
      hue: 'neutral',
      from: { x, y: hubFrame.y + hubFrame.height },
      to: { x, y: sink.frame.y },
      width: CHANNEL_WIDTH,
    });
  }

  return {
    sources,
    hub,
    sinks,
    channels,
    hubGrid: gridOf(hub.well, spacing),
    sinkGrids: sinks.map((sink) => gridOf(sink.well, spacing)),
  };
};

/** A round hub at the origin with the sources evenly spaced around it, the first at the top, each channel pointing in. */
const layoutRadial = (spec: DataFlowSpec): DataFlowLayout => {
  const spacing = spec.spacing ?? DEFAULT_SPACING;
  const hubFrame = { x: -HUB_RADIUS, y: -HUB_RADIUS, width: 2 * HUB_RADIUS, height: 2 * HUB_RADIUS };
  // A round well has no title strip: the hub's label sits inside it, at its foot (drawn by the overlay).
  const hubWell = {
    x: hubFrame.x + WELL_INSET,
    y: hubFrame.y + WELL_INSET,
    width: hubFrame.width - 2 * WELL_INSET,
    height: hubFrame.height - 2 * WELL_INSET,
  };
  const hub = { id: 'hub', label: spec.hub.label, frame: hubFrame, well: hubWell, round: true };

  const count = spec.sources.length;
  const sources: SourceBlock[] = [];
  const channels: Channel[] = [];
  spec.sources.forEach((source, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const centre = { x: direction.x * ORBIT_RADIUS, y: direction.y * ORBIT_RADIUS };
    const frame = {
      x: centre.x - SOURCE_SIZE.width / 2,
      y: centre.y - SOURCE_SIZE.height / 2,
      ...SOURCE_SIZE,
    };
    sources.push(sourceBlock(source, frame, spacing));
    // The channel leaves the square frame where the line to the hub's centre crosses its edge.
    const reach = SOURCE_SIZE.width / 2 / Math.max(Math.abs(direction.x), Math.abs(direction.y));
    channels.push({
      id: `channel-${source.id}`,
      hue: source.hue,
      from: { x: centre.x - direction.x * reach, y: centre.y - direction.y * reach },
      to: { x: direction.x * HUB_RADIUS, y: direction.y * HUB_RADIUS },
      width: CHANNEL_WIDTH,
    });
  });

  return { sources, hub, sinks: [], channels, hubGrid: gridOf(hubWell, spacing, true), sinkGrids: [] };
};

/** Where an application keeps one piece of content: a text line, a sheet cell, or a board card. */
export type AppSlot = Rect;

/** Inset of an application's view inside its well. */
const APP_INSET = 14;

/** The slots an application's view offers, in reading order; molecules flowing in fill them, and flow out of them. */
export const appSlots = (block: Block): AppSlot[] => {
  const { x, y, width, height } = block.well;
  const left = x + APP_INSET;
  const inner = width - 2 * APP_INSET;
  switch (block.app) {
    case 'document': {
      // A title bar, then lines of text of varied length.
      const top = y + APP_INSET + 22;
      const count = Math.floor((height - (top - y) - APP_INSET) / LINE_PITCH);
      return Array.from({ length: count }, (_, index) => ({
        x: left,
        y: top + index * LINE_PITCH,
        width: inner * LINE_LENGTHS[index % LINE_LENGTHS.length],
        height: 7,
      }));
    }
    case 'spreadsheet': {
      // A header row, then the grid of cells below it.
      const columns = 6;
      const rows = 7;
      const cell = { width: inner / columns, height: (height - 2 * APP_INSET) / (rows + 1) };
      return Array.from({ length: columns * rows }, (_, index) => ({
        x: left + (index % columns) * cell.width + 2,
        y: y + APP_INSET + (Math.floor(index / columns) + 1) * cell.height + 2,
        width: cell.width - 4,
        height: cell.height - 4,
      }));
    }
    case 'kanban': {
      // Three columns, each a header and a stack of cards.
      const columns = 3;
      const column = (inner - (columns - 1) * 8) / columns;
      const cards = 4;
      const pitch = (height - 2 * APP_INSET - 18) / cards;
      return Array.from({ length: columns * cards }, (_, index) => ({
        x: left + (index % columns) * (column + 8),
        y: y + APP_INSET + 18 + Math.floor(index / columns) * pitch,
        width: column,
        height: pitch - 6,
      }));
    }
    case 'list': {
      // An inbox: rows, each a sender's mark and a line of subject.
      const count = Math.floor((height - 2 * APP_INSET) / ROW_PITCH);
      return Array.from({ length: count }, (_, index) => ({
        x: left,
        y: y + APP_INSET + index * ROW_PITCH,
        width: inner,
        height: ROW_PITCH - 6,
      }));
    }
    case 'messaging': {
      // A conversation: bubbles taking turns at the left and the right, above the compose bar.
      const count = Math.floor((height - 2 * APP_INSET - COMPOSE_HEIGHT) / BUBBLE_PITCH);
      return Array.from({ length: count }, (_, index) => {
        const bubble = inner * BUBBLE_LENGTHS[index % BUBBLE_LENGTHS.length];
        return {
          x: index % 2 === 0 ? left : left + inner - bubble,
          y: y + APP_INSET + index * BUBBLE_PITCH,
          width: bubble,
          height: BUBBLE_PITCH - 6,
        };
      });
    }
    default:
      return [];
  }
};

/** Vertical distance between a conversation's bubbles, how wide each is in turn, and the compose bar's height. */
const BUBBLE_PITCH = 22;
const BUBBLE_LENGTHS = [0.6, 0.7, 0.5, 0.65, 0.55];
export const COMPOSE_HEIGHT = 18;

/** Vertical distance between an inbox's rows. */
const ROW_PITCH = 24;

/** Vertical distance between a document's text lines. */
const LINE_PITCH = 16;

/** How much of the width each text line fills, in turn, so the text reads ragged. */
const LINE_LENGTHS = [0.95, 0.8, 0.9, 0.6, 0.85, 0.7, 0.92, 0.5];

export const DATA_FLOW_VIEW_ID = 'data-flow';

/** Labels read at the zoom that fits the whole diagram. */
export const LABEL_FONT_SIZE = 26;

/** How far a block's darker base reaches beyond its frame, so the frame sits slightly inside it. */
export const BASE_INSET = 6;

/** The block's outer bounds: its frame grown by its base. */
export const baseOf = (block: Block): Rect => ({
  x: block.frame.x - BASE_INSET,
  y: block.frame.y - BASE_INSET,
  width: block.frame.width + 2 * BASE_INSET,
  height: block.frame.height + 2 * BASE_INSET,
});

/**
 * The static part of the diagram as a canvas scene: one invisible node per block over its whole extent, which the canvas
 * fits, selects and pans by. The overlay draws every container itself (base, frame, label and well), since the canvas's
 * shapes offer only one corner radius and the base, frame and well need concentric ones.
 */
export const createDataFlowView = (layout: DataFlowLayout, revealed = true): View => {
  // Before the monolithic agent is revealed, its blocks are left out, so the camera frames only the silos.
  const monolith = layout.monolith && revealed ? [layout.monolith.group] : [];
  const feed = layout.monolith && revealed ? [layout.monolith.feed] : [];
  const hub = layout.monolith && !revealed ? [] : [layout.hub];
  const blocks = [...monolith, ...layout.sources, ...feed, ...hub, ...layout.sinks].filter(
    (block) => !block.hidden && (!layout.focus || block === layout.hub),
  );
  const keys = initialKeys(blocks.length);
  const nodes: Record<string, Node> = {};
  blocks.forEach((block, index) => {
    const rect = baseOf(block);
    const node: RectNode = {
      type: 'rect',
      id: block.id,
      z: keys[index],
      center: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
      size: { width: rect.width, height: rect.height },
      style: { border: false, fill: false },
    };
    nodes[block.id] = node;
  });
  return { id: DATA_FLOW_VIEW_ID, name: 'Data flow', nodes, links: {} };
};

/** A source's channel down to the hub's top. */
const sourceChannel = (source: SourceBlock, hubTop: number): Channel => ({
  id: `channel-${source.id}`,
  hue: source.hue,
  from: { x: source.frame.x + source.frame.width / 2, y: source.frame.y + source.frame.height },
  to: { x: source.frame.x + source.frame.width / 2, y: hubTop },
  width: CHANNEL_WIDTH,
});

/** A sink's channel down from the hub's bottom. */
const sinkChannel = (sink: Block, hubBottom: number): Channel => ({
  id: `channel-${sink.id}`,
  hue: 'neutral',
  from: { x: sink.frame.x + sink.frame.width / 2, y: hubBottom },
  to: { x: sink.frame.x + sink.frame.width / 2, y: sink.frame.y },
  width: CHANNEL_WIDTH,
});

/**
 * `base` with more added outward on either side, at the pitch of what is already there: sources at the top, agents at
 * the bottom, buckets in the hub, which stretches to hold them. What `base` had keeps its place and its index (the new
 * come after it in every list), and the hub's lattice keeps its origin, so a running simulation can move to it in place.
 */
const extendStacked = (
  base: DataFlowLayout,
  { left = {}, right = {} }: { left?: Extension; right?: Extension },
  spacing: number,
): DataFlowLayout => {
  const outward = <T extends { frame: Rect }>(blocks: readonly T[], side: -1 | 1, count: number, gap: number) => {
    const edge = side < 0 ? blocks[0].frame : blocks[blocks.length - 1].frame;
    const pitch = edge.width + gap;
    return Array.from({ length: count }, (_, index) => ({ ...edge, x: edge.x + side * (index + 1) * pitch }));
  };
  const sources = [
    ...base.sources,
    ...[
      ...(left.sources ?? []).map((source, index) => ({ source, side: -1 as const, index })),
      ...(right.sources ?? []).map((source, index) => ({ source, side: 1 as const, index })),
    ].map(({ source, side, index }) =>
      sourceBlock(source, outward(base.sources, side, index + 1, GAP)[index], spacing),
    ),
  ];
  const baseBuckets = base.hub.buckets ?? [base.hub.well];
  const buckets = [
    ...baseBuckets,
    ...outward(
      baseBuckets.map((frame) => ({ frame })),
      -1,
      left.buckets ?? 0,
      BUCKET_GAP,
    ),
    ...outward(
      baseBuckets.map((frame) => ({ frame })),
      1,
      right.buckets ?? 0,
      BUCKET_GAP,
    ),
  ];
  const wellLeft = Math.min(base.hub.well.x, ...buckets.map((bucket) => bucket.x));
  const wellRight = Math.max(
    base.hub.well.x + base.hub.well.width,
    ...buckets.map((bucket) => bucket.x + bucket.width),
  );
  const frame = {
    ...base.hub.frame,
    x: wellLeft - (base.hub.well.x - base.hub.frame.x),
    width: wellRight - wellLeft + 2 * (base.hub.well.x - base.hub.frame.x),
  };
  const well = { ...base.hub.well, x: wellLeft, width: wellRight - wellLeft };
  const hub: Block = {
    ...base.hub,
    frame,
    well,
    buckets,
    lanes: base.hub.lanes && { ...base.hub.lanes, left: well.x, right: well.x + well.width },
  };
  const newSinks = [
    ...(left.sinks ?? []).map((sink, index) => ({ sink, side: -1 as const, index })),
    ...(right.sinks ?? []).map((sink, index) => ({ sink, side: 1 as const, index })),
  ].map(({ sink, side, index }, at) => {
    const sinkFrame = outward(base.sinks, side, index + 1, GAP)[index];
    return {
      id: `sink-${base.sinks.length + at}`,
      label: sink.label,
      frame: sinkFrame,
      well: wellOf(sinkFrame),
      app: sink.app,
    };
  });
  const sinks = [...base.sinks, ...newSinks];
  return {
    ...base,
    sources,
    hub,
    sinks,
    channels: [
      ...sources.map((source) => sourceChannel(source, frame.y)),
      ...sinks.map((sink) => sinkChannel(sink, frame.y + frame.height)),
    ],
    // The same origin, so the lattice already there keeps its sites; only its reach grows.
    hubGrid: { ...base.hubGrid, bounds: gridOf(well, spacing).bounds },
    sinkGrids: [...base.sinkGrids, ...newSinks.map((sink) => gridOf(sink.well, spacing))],
  };
};
