//
// Copyright 2026 DXOS.org
//

import React, { createContext, useContext, useEffect, useId, useState } from 'react';

import { lineClasses } from '@dxos/react-ui-canvas/scene';
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

/** The colour a settled hub molecule fades to: off-white, light enough to read as neutral and still show on white. */
const SETTLED = 'fill-neutral-300 stroke-neutral-300';

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

/** A plain strip along the channel at any angle, flush with the blocks it joins at both ends. */
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

/** The channel in its hue, washed with white so it reads lighter than the molecules flowing along it. */
const ChannelShape = ({ channel }: { channel: Channel }) => {
  const id = `${useContext(DepthContext).raised}-${channel.id}`;
  const { from, to, width } = channel;
  // Across the channel, from one side to the other: darker at the edges, so it reads as a tube.
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const normal = { x: ((from.y - to.y) / length) * (width / 2), y: ((to.x - from.x) / length) * (width / 2) };
  return (
    <g>
      <defs>
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
      <polygon points={channelPoints(channel)} className={hueLine(channel.hue).fill} />
      <polygon points={channelPoints(channel)} className='fill-white opacity-40' />
      <polygon points={channelPoints(channel)} fill={`url(#${id})`} />
    </g>
  );
};

/** The darker base a container's frame sits slightly inside, its corners concentric with the frame's. */
const ContainerBase = ({ block }: { block: Block }) => {
  const rect = baseOf(block);
  return block.round ? (
    <circle
      cx={rect.x + rect.width / 2}
      cy={rect.y + rect.height / 2}
      r={Math.min(rect.width, rect.height) / 2}
      className='fill-neutral-500'
    />
  ) : (
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      rx={FRAME_RADIUS + BASE_INSET}
      className='fill-neutral-500'
    />
  );
};

/**
 * A container on its base: its frame, washed to read as raised; its label, centred in the strip above the well (or, round,
 * at the well's foot); and its white well, with an inner shadow so it reads as set into the frame.
 */
const Container = ({ block }: { block: Block }) => {
  const { raised, inset } = useContext(DepthContext);
  const { frame, well } = block;
  if (block.round) {
    const cx = frame.x + frame.width / 2;
    const cy = frame.y + frame.height / 2;
    const radius = Math.min(well.width, well.height) / 2;
    return (
      <g>
        <circle cx={cx} cy={cy} r={Math.min(frame.width, frame.height) / 2} className='fill-neutral-300' />
        <circle cx={cx} cy={cy} r={Math.min(frame.width, frame.height) / 2} fill={`url(#${raised})`} />
        <circle cx={cx} cy={cy} r={radius} className='fill-white' filter={`url(#${inset})`} />
        <text
          x={cx}
          y={cy + radius - LABEL_FONT_SIZE * 1.5}
          textAnchor='middle'
          dominantBaseline='middle'
          fontSize={LABEL_FONT_SIZE}
          className='fill-neutral-fg'
        >
          {block.label}
        </text>
      </g>
    );
  }
  return (
    <g>
      <rect
        x={frame.x}
        y={frame.y}
        width={frame.width}
        height={frame.height}
        rx={FRAME_RADIUS}
        className='fill-neutral-300'
      />
      <rect
        x={frame.x}
        y={frame.y}
        width={frame.width}
        height={frame.height}
        rx={FRAME_RADIUS}
        fill={`url(#${raised})`}
      />
      <text
        x={frame.x + frame.width / 2}
        y={frame.y + (well.y - frame.y) / 2}
        textAnchor='middle'
        dominantBaseline='middle'
        fontSize={LABEL_FONT_SIZE}
        className='fill-neutral-fg'
      >
        {block.label}
      </text>
      <rect
        x={well.x}
        y={well.y}
        width={well.width}
        height={well.height}
        rx={WELL_RADIUS}
        className='fill-white'
        filter={`url(#${inset})`}
      />
    </g>
  );
};

/** Bonds across molecules: where each docked molecule attached to the lattice's edge. */
const BondLines = ({ bonds }: { bonds: readonly LatticeBond[] }) => (
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
        className={bond.zone === 'hub' ? SETTLED : lineClasses('neutral').stroke}
      />
    ))}
  </g>
);

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
        <g opacity={tint} className={SETTLED} strokeWidth={BOND_WIDTH}>
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
  const tint = Math.min(1, Math.max(0, (time - item.since - CONTENT_HOLD) / CONTENT_FADE));
  return (
    <g>
      <rect {...rect} rx={rx} className='fill-neutral-400' opacity={tint} />
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
  return (
    <g>
      {block.app === 'document' && (
        <rect x={left} y={top} width={inner * 0.45} height={10} rx={2} className='fill-neutral-400' />
      )}
      {block.app === 'spreadsheet' && slots.length > 0 && (
        <rect x={left} y={top} width={inner} height={slots[0].y - 4 - top} rx={2} className='fill-neutral-200' />
      )}
      {block.app === 'messaging' && (
        <rect
          x={left}
          y={well.y + well.height - 14 - COMPOSE_HEIGHT}
          width={inner}
          height={COMPOSE_HEIGHT}
          rx={COMPOSE_HEIGHT / 2}
          className='fill-none stroke-neutral-300'
        />
      )}
      {block.app === 'kanban' &&
        slots
          .slice(0, 3)
          .map((slot, index) => (
            <rect key={index} x={slot.x} y={top} width={slot.width} height={10} rx={2} className='fill-neutral-300' />
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
            className={soft ? 'fill-neutral-100' : 'fill-none stroke-neutral-200'}
            strokeDasharray={block.app === 'kanban' ? '3 3' : undefined}
          />
        );
      })}
    </g>
  );
};

export type MoleculeOverlayProps = {
  layout: DataFlowLayout;
  simulation: DataFlowSimulation;
  running?: boolean;
  /** Off, only the containers and channels are drawn and nothing moves. */
  molecules?: boolean;
};

/**
 * The animated part of the diagram, drawn in scene coordinates as a canvas overlay: the channels, the lattice bonds,
 * and every molecule.
 */
export const MoleculeOverlay = ({ layout, simulation, running = true, molecules = true }: MoleculeOverlayProps) => {
  const { bodies, bonds, agents, apps, time } = useSimulationFrame(simulation, running && molecules);
  // Molecules in flight draw last, so they pass over the docked lattice rather than under it.
  const ordered = [...bodies].sort((a, b) => Number(a.phase === 'travelling') - Number(b.phase === 'travelling'));
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
    (block) => !block.hidden && visible(block.id) > 0,
  );
  const channels = layout.channels.filter((channel) => visible(channel.id) > 0);
  // A molecule inside an application passes behind it, so the app hides it as it slides in or out under the frame.
  const appRects = layout.sinks.filter((sink) => sink.app).map((sink) => baseOf(sink));
  const behind = (body: Body) =>
    appRects.some(
      (rect) =>
        body.cursor.x >= rect.x &&
        body.cursor.x <= rect.x + rect.width &&
        body.cursor.y >= rect.y &&
        body.cursor.y <= rect.y + rect.height,
    );
  return (
    <DepthContext.Provider value={depth}>
      <svg className='absolute overflow-visible pointer-events-none' width={1} height={1}>
        <DepthDefs {...depth} />
        {/* Bases first, then the channels over their rims, then the containers, so a channel runs into its frame. */}
        {blocks.map((block) => (
          <g key={block.id} opacity={visible(block.id)}>
            <ContainerBase block={block} />
          </g>
        ))}
        {channels.map((channel) => (
          <g key={channel.id} opacity={visible(channel.id)}>
            <ChannelShape channel={channel} />
          </g>
        ))}
        {molecules && ordered.filter(behind).map((body) => <MoleculeShape key={body.id} body={body} />)}
        {blocks.map((block) => (
          <g key={block.id} opacity={visible(block.id)}>
            <Container block={block} />
            {block.app && <AppView block={block} items={apps[layout.sinks.indexOf(block)] ?? []} time={time} />}
          </g>
        ))}
        {molecules && <BondLines bonds={bonds} />}
        {molecules &&
          ordered.filter((body) => !behind(body)).map((body) => <MoleculeShape key={body.id} body={body} />)}
      </svg>
    </DepthContext.Provider>
  );
};
