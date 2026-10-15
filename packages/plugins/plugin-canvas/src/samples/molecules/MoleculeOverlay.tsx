//
// Copyright 2026 DXOS.org
//

import React, { createContext, useContext, useEffect, useId, useState } from 'react';

import { type BackgroundGrid, STYLE_SET_IDS, lineClasses } from '@dxos/react-ui-canvas/scene';
import { mx } from '@dxos/ui-theme';

import {
  type AppSlot,
  BASE_INSET,
  type Block,
  type Channel,
  COMPOSE_HEIGHT,
  type DataFlowLayout,
  LABEL_FONT_SIZE,
  appSlots,
  baseOf,
} from './layout.ts';
import {
  AGENT_FADE,
  type AppItem,
  type Body,
  type DataFlowSimulation,
  type Frame,
  type LatticeBond,
} from './simulation.ts';

const ATOM_RADIUS = 5.5;

/** Magenta, which the canvas's own line colours lack, so the diagram can give a source that hue too. */
const EXTRA_HUES: Record<string, { stroke: string; fill: string }> = {
  fuchsia: { stroke: 'stroke-fuchsia-border', fill: 'fill-fuchsia-border' },
};

/** The stroke and fill classes for a hue: the canvas's line colours, plus magenta. */
const hueLine = (hue: string) => EXTRA_HUES[hue] ?? lineClasses(hue);
const BOND_WIDTH = 2;

/**
 * Steps `simulation` once per animation frame while `running` and answers the latest frame. The frame is a fresh value
 * each time, since the simulation mutates its own state and a memoized render would never see that change.
 */
export const useSimulationFrame = (simulation: DataFlowSimulation, running = true): Frame => {
  const [frame, setFrame] = useState(() => simulation.frame());
  useEffect(() => {
    setFrame(simulation.frame());
    if (!running) {
      return;
    }
    let handle = 0;
    let last: number | undefined;
    const loop = (now: number) => {
      simulation.step(last === undefined ? 0 : (now - last) / 1000);
      last = now;
      setFrame(simulation.frame());
      handle = requestAnimationFrame(loop);
    };
    handle = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(handle);
  }, [simulation, running]);
  return frame;
};

/** Corner radius of a square frame; its base's is this plus the base's inset, so the two are concentric. */
const FRAME_RADIUS = 10;

/** Height of a group container's title strip, the same as a container's. */
const GROUP_TITLE = 48;

/** Corner radius of a square well: softer than its frame's, which it sits well inside. */
const WELL_RADIUS = 6;

/** The ids of the overlay's shared SVG definitions, unique per overlay so two views on a page do not collide. */
const DepthContext = createContext({ raised: '', inset: '' });

/**
 * Shared definitions for depth: `raised`, a wash lighter at the top and darker at the bottom that makes a frame read as
 * lit from above; `inset`, an inner shadow that makes a well read as set into its frame.
 */
const DepthDefs = ({ raised, inset }: { raised: string; inset: string }) => (
  <defs>
    <linearGradient id={raised} x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0' stopColor='white' stopOpacity={0.35} />
      <stop offset='0.45' stopColor='white' stopOpacity={0} />
      <stop offset='1' stopColor='black' stopOpacity={0.25} />
    </linearGradient>
    <filter id={inset} x='-10%' y='-10%' width='120%' height='120%'>
      <feOffset dx={0} dy={3} />
      <feGaussianBlur stdDeviation={4} result='blur' />
      <feComposite operator='out' in='SourceGraphic' in2='blur' result='rim' />
      <feFlood floodColor='black' floodOpacity={0.3} />
      <feComposite operator='in' in2='rim' result='shadow' />
      <feComposite operator='over' in='shadow' in2='SourceGraphic' />
    </filter>
  </defs>
);

/**
 * How containers, channels and app content are drawn: one of the canvas's built-in style sets, so the sample and the
 * canvas name their looks alike. `classic`, raised gray frames on darker bases with white, inset wells and shaded tubes;
 * `flat`, cards with hairline borders and solid channels; `outline`, line art with no fills and channels as rails;
 * `glass`, translucent frosted cards and channels.
 */
export type Look = (typeof STYLE_SET_IDS)[number];

export const LOOKS: readonly Look[] = STYLE_SET_IDS;

/** Whether the background under the diagram is light or dark, which picks a look's palette. */
export type LookTone = 'light' | 'dark';

type Palette = {
  /** The base a frame sits on; none for a look without one. */
  base?: string;
  frame: string;
  frameStroke?: string;
  /** Whether the frame takes the lit-from-above wash. */
  raised: boolean;
  group: string;
  label: string;
  well: string;
  wellStroke?: string;
  /** Whether the well takes the inner shadow. */
  inset: boolean;
  channel: 'tube' | 'solid' | 'rails' | 'glass';
  /** The colour a settled hub molecule (and its bonds) fades to: neutral, yet still clear of the background. */
  molecule: string;
  /** App content: settled content, title and header bars, faint bars, empty soft slots, empty outlined slots, outlines. */
  settled: string;
  decor: string;
  faint: string;
  empty: string;
  emptyStroke: string;
  outline: string;
};

const DARK_PALETTES: Record<Look, Palette> = {
  classic: {
    base: 'fill-neutral-500',
    frame: 'fill-neutral-300',
    raised: true,
    group: 'fill-neutral-400',
    label: 'fill-neutral-fg',
    well: 'fill-white',
    inset: true,
    channel: 'tube',
    molecule: 'fill-neutral-300 stroke-neutral-300',
    settled: 'fill-neutral-400',
    decor: 'fill-neutral-400',
    faint: 'fill-neutral-200',
    empty: 'fill-neutral-100',
    emptyStroke: 'fill-none stroke-neutral-200',
    outline: 'fill-none stroke-neutral-300',
  },
  flat: {
    frame: 'fill-neutral-800',
    frameStroke: 'stroke-neutral-700',
    raised: false,
    group: 'fill-neutral-900',
    label: 'fill-neutral-200',
    well: 'fill-neutral-900',
    inset: false,
    channel: 'solid',
    molecule: 'fill-neutral-300 stroke-neutral-300',
    settled: 'fill-neutral-600',
    decor: 'fill-neutral-600',
    faint: 'fill-neutral-700',
    empty: 'fill-neutral-800',
    emptyStroke: 'fill-none stroke-neutral-700',
    outline: 'fill-none stroke-neutral-600',
  },
  outline: {
    frame: 'fill-none',
    frameStroke: 'stroke-neutral-500',
    raised: false,
    group: 'fill-none',
    label: 'fill-neutral-300',
    well: 'fill-none',
    wellStroke: 'stroke-neutral-700',
    inset: false,
    channel: 'rails',
    molecule: 'fill-neutral-300 stroke-neutral-300',
    settled: 'fill-neutral-500',
    decor: 'fill-neutral-500',
    faint: 'fill-neutral-700',
    empty: 'fill-none stroke-neutral-700',
    emptyStroke: 'fill-none stroke-neutral-700',
    outline: 'fill-none stroke-neutral-600',
  },
  glass: {
    frame: 'fill-white/10',
    frameStroke: 'stroke-white/20',
    raised: false,
    group: 'fill-white/5',
    label: 'fill-neutral-100',
    well: 'fill-black/30',
    wellStroke: 'stroke-white/10',
    inset: false,
    channel: 'glass',
    molecule: 'fill-neutral-300 stroke-neutral-300',
    settled: 'fill-white/40',
    decor: 'fill-white/40',
    faint: 'fill-white/15',
    empty: 'fill-white/10',
    emptyStroke: 'fill-none stroke-white/15',
    outline: 'fill-none stroke-white/30',
  },
};

/** The looks retuned for a light background such as paper: dark labels, mid-gray content, dark hairlines. */
const LIGHT_PALETTES: Record<Look, Palette> = {
  classic: DARK_PALETTES.classic,
  flat: {
    frame: 'fill-neutral-100',
    frameStroke: 'stroke-neutral-300',
    raised: false,
    group: 'fill-neutral-50',
    label: 'fill-neutral-700',
    well: 'fill-white',
    wellStroke: 'stroke-neutral-200',
    inset: false,
    channel: 'solid',
    molecule: 'fill-neutral-400 stroke-neutral-400',
    settled: 'fill-neutral-400',
    decor: 'fill-neutral-400',
    faint: 'fill-neutral-200',
    empty: 'fill-neutral-100',
    emptyStroke: 'fill-none stroke-neutral-300',
    outline: 'fill-none stroke-neutral-300',
  },
  outline: {
    frame: 'fill-none',
    frameStroke: 'stroke-neutral-500',
    raised: false,
    group: 'fill-none',
    label: 'fill-neutral-700',
    well: 'fill-none',
    wellStroke: 'stroke-neutral-300',
    inset: false,
    channel: 'rails',
    molecule: 'fill-neutral-400 stroke-neutral-400',
    settled: 'fill-neutral-500',
    decor: 'fill-neutral-500',
    faint: 'fill-neutral-300',
    empty: 'fill-none stroke-neutral-300',
    emptyStroke: 'fill-none stroke-neutral-300',
    outline: 'fill-none stroke-neutral-400',
  },
  glass: {
    frame: 'fill-white/55',
    frameStroke: 'stroke-black/10',
    raised: false,
    group: 'fill-white/30',
    label: 'fill-neutral-800',
    well: 'fill-black/5',
    wellStroke: 'stroke-black/10',
    inset: false,
    channel: 'glass',
    molecule: 'fill-neutral-400 stroke-neutral-400',
    settled: 'fill-neutral-400',
    decor: 'fill-neutral-400',
    faint: 'fill-black/10',
    empty: 'fill-black/5',
    emptyStroke: 'fill-none stroke-black/15',
    outline: 'fill-none stroke-black/20',
  },
};

/** Each look's palette for a light and a dark background. */
const PALETTES: Record<LookTone, Record<Look, Palette>> = { light: LIGHT_PALETTES, dark: DARK_PALETTES };

/**
 * The grid behind the containers, aligned with the canvas's own: `dots` at every minor grid point, `lines` along the
 * minor and (stronger) major grid lines, or `none`. The canvas's background draws it.
 */
export type Grid = BackgroundGrid;

export const GRIDS: readonly Grid[] = ['dots', 'lines', 'none'];

/** The palette the overlay draws with. */
const LookContext = createContext<Palette>(DARK_PALETTES.classic);

/** Whether `point` lies on or within `rect`, give or take a pixel. */
const touches = (point: { x: number; y: number }, rect: Block['frame']) =>
  point.x >= rect.x - 1 &&
  point.x <= rect.x + rect.width + 1 &&
  point.y >= rect.y - 1 &&
  point.y <= rect.y + rect.height + 1;

/**
 * The channel lengthened by its width at each end that meets one of `outlines`, so an angled end or a round rim leaves
 * no gap once the outlines mask it; an end on anything else (a group container) stays where it is.
 */
const overreach = (channel: Channel, outlines: readonly Block['frame'][]): Channel => {
  const { from, to, width } = channel;
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const step = { x: ((to.x - from.x) / length) * width, y: ((to.y - from.y) / length) * width };
  const reaches = (point: { x: number; y: number }) => outlines.some((rect) => touches(point, rect));
  return {
    ...channel,
    from: reaches(from) ? { x: from.x - step.x, y: from.y - step.y } : from,
    to: reaches(to) ? { x: to.x + step.x, y: to.y + step.y } : to,
  };
};

/** A block's outer edge, filled: its base for a look that draws one, else its frame; round for a round block. */
const BlockOutline = ({ rect, round, radius }: { rect: Block['frame']; round?: boolean; radius: number }) =>
  round ? (
    <circle
      cx={rect.x + rect.width / 2}
      cy={rect.y + rect.height / 2}
      r={Math.min(rect.width, rect.height) / 2}
      fill='black'
    />
  ) : (
    <rect {...rect} rx={radius} fill='black' />
  );

/** A plain strip along the channel at any angle, between the two points it is given. */
const channelPoints = ({ from, to, width }: Channel): string => {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const normal = { x: ((from.y - to.y) / length) * (width / 2), y: ((to.x - from.x) / length) * (width / 2) };
  return [
    [from.x + normal.x, from.y + normal.y],
    [to.x + normal.x, to.y + normal.y],
    [to.x - normal.x, to.y - normal.y],
    [from.x - normal.x, from.y - normal.y],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(' ');
};

/**
 * The channel in its hue, per the look: a shaded tube (washed with white so it reads lighter than the molecules on it),
 * a solid muted strip, a pair of rails, or a translucent glass strip with fine edges.
 */
const ChannelShape = ({ channel }: { channel: Channel }) => {
  const palette = useContext(LookContext);
  const id = `${useContext(DepthContext).raised}-${channel.id}`;
  const { from, to, width } = channel;
  const hue = hueLine(channel.hue);
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const normal = { x: ((from.y - to.y) / length) * (width / 2), y: ((to.x - from.x) / length) * (width / 2) };
  const points = channelPoints(channel);
  const edges = (
    <g className={hue.stroke}>
      <line x1={from.x + normal.x} y1={from.y + normal.y} x2={to.x + normal.x} y2={to.y + normal.y} />
      <line x1={from.x - normal.x} y1={from.y - normal.y} x2={to.x - normal.x} y2={to.y - normal.y} />
    </g>
  );
  switch (palette.channel) {
    case 'solid':
      return <polygon points={points} className={hue.fill} opacity={0.55} />;
    case 'rails':
      return (
        <g strokeWidth={2}>
          <polygon points={points} className={hue.fill} opacity={0.12} />
          {edges}
        </g>
      );
    case 'glass':
      return (
        <g strokeWidth={1}>
          <polygon points={points} className={hue.fill} opacity={0.3} />
          <g opacity={0.7}>{edges}</g>
        </g>
      );
    case 'tube':
      return (
        <g>
          <defs>
            {/* Across the channel, from one side to the other: darker at the edges, so it reads as a tube. */}
            <linearGradient
              id={id}
              gradientUnits='userSpaceOnUse'
              x1={from.x + normal.x}
              y1={from.y + normal.y}
              x2={from.x - normal.x}
              y2={from.y - normal.y}
            >
              <stop offset='0' stopColor='black' stopOpacity={0.25} />
              <stop offset='0.35' stopColor='white' stopOpacity={0.15} />
              <stop offset='0.65' stopColor='white' stopOpacity={0.15} />
              <stop offset='1' stopColor='black' stopOpacity={0.25} />
            </linearGradient>
          </defs>
          <polygon points={points} className={hue.fill} />
          <polygon points={points} className='fill-white opacity-40' />
          <polygon points={points} fill={`url(#${id})`} />
        </g>
      );
  }
};

/** The darker base a container's frame sits slightly inside, its corners concentric with the frame's. */
const ContainerBase = ({ block }: { block: Block }) => {
  const { base } = useContext(LookContext);
  const rect = baseOf(block);
  if (!base) {
    return null;
  }
  return block.round ? (
    <circle
      cx={rect.x + rect.width / 2}
      cy={rect.y + rect.height / 2}
      r={Math.min(rect.width, rect.height) / 2}
      className={base}
    />
  ) : (
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      rx={FRAME_RADIUS + BASE_INSET}
      className={base}
    />
  );
};

/**
 * A container per the look: its frame (raised, outlined or translucent); its label, centred in the strip above the
 * well (or, round, at the well's foot); and its well (white and inset, dark, outlined or tinted). A group container is
 * a frame and label around others, with no well of its own.
 */
const Container = ({ block }: { block: Block }) => {
  const palette = useContext(LookContext);
  const { raised, inset } = useContext(DepthContext);
  const { frame, well } = block;
  const frameProps = {
    className: palette.frameStroke ? mx(palette.frame, palette.frameStroke) : palette.frame,
    strokeWidth: palette.frameStroke ? 1 : undefined,
  };
  const wellProps = {
    className: palette.wellStroke ? mx(palette.well, palette.wellStroke) : palette.well,
    strokeWidth: palette.wellStroke ? 1 : undefined,
    filter: palette.inset ? `url(#${inset})` : undefined,
  };
  const label = (x: number, y: number) => (
    <text
      x={x}
      y={y}
      textAnchor='middle'
      dominantBaseline='middle'
      fontSize={LABEL_FONT_SIZE}
      className={palette.label}
    >
      {block.label}
    </text>
  );
  const wash = (shape: React.ReactNode) => (palette.raised ? shape : null);
  if (block.group) {
    const groupRect = { x: frame.x, y: frame.y, width: frame.width, height: frame.height, rx: FRAME_RADIUS };
    return (
      <g>
        <rect {...groupRect} {...frameProps} className={mx(palette.group, palette.frameStroke)} />
        {wash(<rect {...groupRect} fill={`url(#${raised})`} />)}
        {label(frame.x + frame.width / 2, frame.y + GROUP_TITLE / 2)}
      </g>
    );
  }
  if (block.round) {
    const cx = frame.x + frame.width / 2;
    const cy = frame.y + frame.height / 2;
    const outer = Math.min(frame.width, frame.height) / 2;
    const radius = Math.min(well.width, well.height) / 2;
    return (
      <g>
        <circle cx={cx} cy={cy} r={outer} {...frameProps} />
        {wash(<circle cx={cx} cy={cy} r={outer} fill={`url(#${raised})`} />)}
        <circle cx={cx} cy={cy} r={radius} {...wellProps} />
        {label(cx, cy + radius - LABEL_FONT_SIZE * 1.5)}
      </g>
    );
  }
  const frameRect = { x: frame.x, y: frame.y, width: frame.width, height: frame.height, rx: FRAME_RADIUS };
  return (
    <g>
      <rect {...frameRect} {...frameProps} />
      {wash(<rect {...frameRect} fill={`url(#${raised})`} />)}
      {label(frame.x + frame.width / 2, frame.y + (well.y - frame.y) / 2)}
      {(block.buckets ?? [well]).map((bucket, index) => (
        <rect
          key={index}
          x={bucket.x}
          y={bucket.y}
          width={bucket.width}
          height={bucket.height}
          rx={WELL_RADIUS}
          {...wellProps}
        />
      ))}
    </g>
  );
};

/** Bonds across molecules: where each docked molecule attached to the lattice's edge. */
const BondLines = ({ bonds }: { bonds: readonly LatticeBond[] }) => {
  const { molecule } = useContext(LookContext);
  return (
    <g strokeWidth={BOND_WIDTH}>
      {bonds.map((bond) => (
        <line
          key={bond.id}
          x1={bond.from.x}
          y1={bond.from.y}
          x2={bond.to.x}
          y2={bond.to.y}
          opacity={bond.opacity}
          // In the hub the bonds settle to the same off-white as its molecules.
          className={bond.zone === 'hub' ? molecule : lineClasses('neutral').stroke}
        />
      ))}
    </g>
  );
};

/** The atoms and bonds of `body` in one colour. */
const Atoms = ({ body, hue, opacity }: { body: Body; hue: string; opacity?: number }) => {
  const { stroke, fill } = hueLine(hue);
  const { offsets } = body;
  return (
    <g opacity={opacity}>
      <g className={stroke} strokeWidth={BOND_WIDTH}>
        {body.molecule.bonds.map(([from, to]) => (
          <line key={`${from}-${to}`} x1={offsets[from].x} y1={offsets[from].y} x2={offsets[to].x} y2={offsets[to].y} />
        ))}
      </g>
      <g className={fill}>
        {offsets.map((offset, index) => (
          <circle key={index} cx={offset.x} cy={offset.y} r={ATOM_RADIUS} />
        ))}
      </g>
    </g>
  );
};

const MoleculeShape = ({ body }: { body: Body }) => {
  const { molecule } = useContext(LookContext);
  const tint = body.tint ?? 0;
  return (
    <g transform={`translate(${body.position.x} ${body.position.y})`} opacity={body.opacity}>
      {body.synced && (
        <circle
          r={ATOM_RADIUS * 2}
          className={mx('fill-none', hueLine(body.hue).stroke)}
          strokeWidth={1}
          strokeDasharray='2 2'
          opacity={1 - tint}
        />
      )}
      {tint < 1 && <Atoms body={body} hue={body.hue} opacity={1 - tint} />}
      {tint > 0 && (
        <g opacity={tint} className={molecule} strokeWidth={BOND_WIDTH}>
          {body.molecule.bonds.map(([from, to]) => (
            <line
              key={`${from}-${to}`}
              x1={body.offsets[from].x}
              y1={body.offsets[from].y}
              x2={body.offsets[to].x}
              y2={body.offsets[to].y}
            />
          ))}
          {body.offsets.map((offset, index) => (
            <circle key={index} cx={offset.x} cy={offset.y} r={ATOM_RADIUS} />
          ))}
        </g>
      )}
    </g>
  );
};

/** Seconds a fresh piece of app content keeps its source's colour, and then takes to fade to the app's own gray. */
const CONTENT_HOLD = 0.4;
const CONTENT_FADE = 1.5;

/** A piece of content in its source's colour, fading to gray as it settles (and flaring again when it is written out). */
const Content = ({ rect, item, time, rx }: { rect: AppSlot; item: AppItem; time: number; rx: number }) => {
  const { settled } = useContext(LookContext);
  const tint = Math.min(1, Math.max(0, (time - item.since - CONTENT_HOLD) / CONTENT_FADE));
  return (
    <g>
      <rect {...rect} rx={rx} className={settled} opacity={tint} />
      <rect {...rect} rx={rx} className={hueLine(item.hue).fill} opacity={1 - tint} />
    </g>
  );
};

/**
 * An application's simplified view inside its well: a document's title and text lines, a spreadsheet's header and
 * cells, or a board's column headers and cards. Empty slots show faintly; filled ones show the content molecules made.
 */
const AppView = ({ block, items, time }: { block: Block; items: readonly (AppItem | undefined)[]; time: number }) => {
  const slots = appSlots(block);
  const { well } = block;
  const top = well.y + 14;
  const left = well.x + 14;
  const inner = well.width - 28;
  const radius = block.app === 'messaging' ? 6 : block.app === 'document' || block.app === 'list' ? 3 : 2;
  const soft = block.app === 'document' || block.app === 'list' || block.app === 'messaging';
  const palette = useContext(LookContext);
  return (
    <g>
      {block.app === 'document' && (
        <rect x={left} y={top} width={inner * 0.45} height={10} rx={2} className={palette.decor} />
      )}
      {block.app === 'spreadsheet' && slots.length > 0 && (
        <rect x={left} y={top} width={inner} height={slots[0].y - 4 - top} rx={2} className={palette.faint} />
      )}
      {block.app === 'messaging' && (
        <rect
          x={left}
          y={well.y + well.height - 14 - COMPOSE_HEIGHT}
          width={inner}
          height={COMPOSE_HEIGHT}
          rx={COMPOSE_HEIGHT / 2}
          className={palette.outline}
        />
      )}
      {block.app === 'kanban' &&
        slots
          .slice(0, 3)
          .map((slot, index) => (
            <rect key={index} x={slot.x} y={top} width={slot.width} height={10} rx={2} className={palette.faint} />
          ))}
      {slots.map((slot, index) => {
        const item = items[index];
        return item ? (
          <Content key={index} rect={slot} item={item} time={time} rx={radius} />
        ) : (
          <rect
            key={index}
            {...slot}
            rx={radius}
            className={soft ? palette.empty : palette.emptyStroke}
            strokeDasharray={block.app === 'kanban' ? '3 3' : undefined}
          />
        );
      })}
    </g>
  );
};

/** Room around the blocks the app mask covers, so a molecule in flight beyond them is never clipped. */
const MASK_PAD = 2000;

/** The rectangle every block lies in, padded by `MASK_PAD`; undefined when no block is shown. */
const drawingExtent = (layout: DataFlowLayout) => {
  const frames = [...layout.sources, layout.hub, ...layout.sinks, ...(layout.monolith ? [layout.monolith.group] : [])]
    .filter((block) => !block.hidden)
    .map((block) => baseOf(block));
  if (frames.length === 0) {
    return undefined;
  }
  const left = Math.min(...frames.map((frame) => frame.x)) - MASK_PAD;
  const top = Math.min(...frames.map((frame) => frame.y)) - MASK_PAD;
  const right = Math.max(...frames.map((frame) => frame.x + frame.width)) + MASK_PAD;
  const bottom = Math.max(...frames.map((frame) => frame.y + frame.height)) + MASK_PAD;
  return { x: left, y: top, width: right - left, height: bottom - top };
};

export type MoleculeOverlayProps = {
  layout: DataFlowLayout;
  simulation: DataFlowSimulation;
  running?: boolean;
  /** Off, only the containers and channels are drawn and nothing moves. */
  molecules?: boolean;
  look?: Look;
  /** The background's tone, which picks the look's palette. */
  tone?: LookTone;
};

/**
 * The animated part of the diagram, drawn in scene coordinates as a canvas overlay: the channels, the lattice bonds,
 * and every molecule.
 */
export const MoleculeOverlay = ({
  layout,
  simulation,
  running = true,
  molecules = true,
  look = 'glass',
  tone = 'dark',
}: MoleculeOverlayProps) => {
  const { bodies, bonds, agents, apps, time } = useSimulationFrame(simulation, running && molecules);
  // Molecules in flight draw last, so they pass over the docked lattice rather than under it.
  const ordered = [...bodies]
    .filter((body) => !layout.focus || (body.zone === 'hub' && body.phase === 'docked'))
    .sort((a, b) => Number(a.phase === 'travelling') - Number(b.phase === 'travelling'));
  // `useId` answers colons, which a `url(#…)` reference cannot hold.
  const base = useId().replace(/:/g, '');
  const depth = { raised: `${base}-raised`, inset: `${base}-inset` };
  // A sink shows once its agent has appeared, fading in with its channel; the sources and hub are always there.
  const shown = new Map<string, number>(
    layout.sinks.flatMap((sink, index) => {
      const opacity = index < agents.length ? Math.min(1, agents[index] / AGENT_FADE) : 0;
      return [
        [sink.id, opacity],
        [`channel-${sink.id}`, opacity],
      ];
    }),
  );
  const visible = (id: string) => shown.get(id) ?? 1;
  const blocks = [...layout.sources, layout.hub, ...layout.sinks].filter(
    (block) => !block.hidden && visible(block.id) > 0 && (!layout.focus || block === layout.hub),
  );
  // A group container sits under everything inside it, so it is drawn whole before any other container.
  const groups = layout.monolith && !layout.focus ? [layout.monolith.group] : [];
  const channels = layout.focus ? [] : layout.channels.filter((channel) => visible(channel.id) > 0);
  // Molecules slide under an application's container as they enter or leave it, clipped exactly at its visible edge:
  // the base for a look that draws one, else the frame.
  const palette = PALETTES[tone][look];
  const radius = palette.base ? FRAME_RADIUS + BASE_INSET : FRAME_RADIUS;
  const appBases = layout.sinks
    .filter((sink) => sink.app && !sink.hidden)
    .map((sink) => ({ sink, rect: palette.base ? baseOf(sink) : sink.frame }));
  const extent = drawingExtent(layout);
  // Channels overreach into the blocks they join and are cut at each block's outer edge, so they meet every rim
  // exactly and never show through a translucent container.
  const outlines = [...layout.sources, layout.hub, ...layout.sinks]
    .filter((block) => !block.hidden)
    .map((block) => ({ block, rect: palette.base ? baseOf(block) : block.frame }));
  return (
    <LookContext.Provider value={palette}>
      <DepthContext.Provider value={depth}>
        <svg className='absolute overflow-visible pointer-events-none' width={1} height={1}>
          <DepthDefs {...depth} />
          {/* Bases first, then the channels over their rims, then the containers, so a channel runs into its frame. */}
          {groups.map((group) => (
            <g key={group.id}>
              <ContainerBase block={group} />
              <Container block={group} />
            </g>
          ))}
          {blocks.map((block) => (
            <g key={block.id} opacity={visible(block.id)}>
              <ContainerBase block={block} />
            </g>
          ))}
          {extent && (
            <defs>
              <mask id={`${base}-channels`} maskUnits='userSpaceOnUse' {...extent}>
                <rect {...extent} fill='white' />
                {outlines.map(({ block, rect }) => (
                  <BlockOutline key={block.id} rect={rect} round={block.round} radius={radius} />
                ))}
              </mask>
            </defs>
          )}
          <g mask={extent ? `url(#${base}-channels)` : undefined}>
            {channels.map((channel) => (
              <g key={channel.id} opacity={visible(channel.id)}>
                <ChannelShape
                  channel={overreach(
                    channel,
                    outlines.map(({ rect }) => rect),
                  )}
                />
              </g>
            ))}
          </g>
          {blocks.map((block) => (
            <g key={block.id} opacity={visible(block.id)}>
              <Container block={block} />
              {block.app && <AppView block={block} items={apps[layout.sinks.indexOf(block)] ?? []} time={time} />}
            </g>
          ))}
          {molecules && extent && (
            <>
              <defs>
                <mask id={`${base}-apps`} maskUnits='userSpaceOnUse' {...extent}>
                  <rect {...extent} fill='white' />
                  {appBases.map(({ sink, rect }) => (
                    <BlockOutline key={sink.id} rect={rect} round={sink.round} radius={radius} />
                  ))}
                </mask>
              </defs>
              <g mask={`url(#${base}-apps)`}>
                <BondLines bonds={bonds} />
                {ordered.map((body) => (
                  <MoleculeShape key={body.id} body={body} />
                ))}
              </g>
            </>
          )}
        </svg>
      </DepthContext.Provider>
    </LookContext.Provider>
  );
};
