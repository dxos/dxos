//
// Copyright 2026 DXOS.org
//

//
// The deck's space graph as a canvas element kind rather than a Generator: one ECHO space drawn as a circle holding a
// connected graph of objects on a hexagonal lattice, generated from a seed.
//
// Why a kind and not a generator (STUDIO-CARDS.md §9): a kind's fields are its configuration — they show in the
// Properties panel, so the seed, the density and the readers are edited rather than written into a parameter blob —
// and a kind's view reads the scene, so a reader card is resolved by id and followed as it moves without the
// binding machinery. The geometry is the same module either way (`space-graph.generator.ts`), so the golden check
// covers both.
//
// What a kind still cannot do: anchor a link to an object *inside* it. A `Port` sits on a side of the frame at an
// offset, so there is no port at an interior point. The canvas link therefore ends on the circle, and the node
// draws the leg from there to the object it taps.
//

import './theme.css';

import * as Schema from 'effect/Schema';
import React from 'react';

import { type ElementKindSpec, type NodeViewProps } from '@dxos/react-ui-canvas';
import { StepAnnotation } from '@dxos/react-ui-form';
import { Scene } from '@dxos/scene';

import { curve, layout, pick, toward } from './space-graph/space-graph.generator.ts';

/**
 * A hue of the canvas theme, and its classes written out. Tailwind only emits the classes it reads verbatim in
 * source, so a `fill-${hue}-border` built at runtime would draw nothing.
 */
const HUES = ['neutral', 'red', 'orange', 'amber', 'green', 'teal', 'sky', 'blue', 'violet'] as const;

type Hue = (typeof HUES)[number];

const FILL: Record<Hue, string> = {
  neutral: 'fill-neutral-border',
  red: 'fill-red-border',
  orange: 'fill-orange-border',
  amber: 'fill-amber-border',
  green: 'fill-green-border',
  teal: 'fill-teal-border',
  sky: 'fill-sky-border',
  blue: 'fill-blue-border',
  violet: 'fill-violet-border',
};

const STROKE: Record<Hue, string> = {
  neutral: 'stroke-neutral-border',
  red: 'stroke-red-border',
  orange: 'stroke-orange-border',
  amber: 'stroke-amber-border',
  green: 'stroke-green-border',
  teal: 'stroke-teal-border',
  sky: 'stroke-sky-border',
  blue: 'stroke-blue-border',
  violet: 'stroke-violet-border',
};

//
// The form reads `Schema.isInt` and `Schema.isBetween` off a field's checks (react-ui-form
// `fields/numeric-constraints.ts`): an integer field steps by 1 and a bounded one clamps, so the
// constraints are declared rather than annotated with a step.
//

export const spaceGraphFields = {
  /** Same seed, same graph. */
  seed: Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)).annotate({ title: 'Seed' }),
  /** Distance between neighbouring lattice points, in scene units: how far apart the objects sit. */
  pitch: Schema.optional(
    Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 8, maximum: 120 })).annotate({ title: 'Spacing' }),
  ),
  /** Share of the lattice that becomes objects (0–1): how full the space is. */
  fill: Schema.optional(
    Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 }))
      .annotate({ title: 'Population' })
      .pipe(StepAnnotation.set(0.05)),
  ),
  /** Chance that each neighbouring pair beyond the spanning tree is linked (0–1): how connected the graph is. */
  extra: Schema.optional(
    Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 }))
      .annotate({ title: 'Link density' })
      .pipe(StepAnnotation.set(0.05)),
  ),
  /** Object radius as a percentage of pitch. Not `size`, which every element already has as its frame. */
  objectSize: Schema.optional(
    Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 5, maximum: 50 })).annotate({
      title: 'Object size',
    }),
  ),
  /**
   * The cards that read and write this space, by node id (`research/box`). Each one draws a leg to the
   * `picks` objects nearest the point it aims at, and those objects light up — the agents reaching into
   * the space. The view resolves each id against the scene, so a reader followed as its card moves.
   */
  readers: Schema.optional(Schema.Array(Schema.String).annotate({ title: 'Readers' })),
  /** Objects each reader reaches, and lights. */
  picks: Schema.optional(
    Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 1, maximum: 6 })).annotate({
      title: 'Objects per reader',
    }),
  ),
  /** Lit objects and reader legs. */
  hue: Schema.optional(Schema.Literals(HUES).annotate({ title: 'Hue' })),
};

export const SpaceGraphNode = Schema.Struct({
  ...Scene.Element2D.fields,
  type: Schema.Literal('space-graph'),
  ...spaceGraphFields,
});

type SpaceGraphFields = Schema.Struct.Type<typeof spaceGraphFields>;

const isSpaceGraph = (node: NodeViewProps['node']): node is NodeViewProps['node'] & SpaceGraphFields =>
  node.type === 'space-graph';

const DEFAULTS = { pitch: 26, fill: 0.6, extra: 0.45, objectSize: 24, picks: 2, hue: 'blue' } as const;

export const SpaceGraphNodeView = ({ node, scene }: NodeViewProps) => {
  if (!isSpaceGraph(node)) {
    return null;
  }

  const settings = { ...DEFAULTS, ...node };
  // `layout` names the object radius `size`, which an element's own `size` (its frame) already takes.
  const params = { ...settings, size: settings.objectSize };
  const { width, height } = node.size;
  // Local coordinates: the circle is inscribed in the node's frame, so the graph moves and resizes with the node.
  const center = { x: width / 2, y: height / 2 };
  const radius = Math.min(width, height) / 2;
  const { cells, nodes, links, nodeR } = layout(center, radius, params);
  const origin = { x: node.center.x - width / 2, y: node.center.y - height / 2 };

  // A reader is a node of the scene, read by id: no binding, and it follows the card as it moves.
  const lit = new Map<number, number>();
  const legs: string[] = [];
  (node.readers ?? []).forEach((id, reader_index) => {
    const reader = scene.nodes[id];
    if (!reader) {
      return;
    }
    // The reader in this node's own coordinates, so `toward` aims as it does on the slide.
    const from = {
      x: reader.center.x + reader.size.width / 2 - origin.x,
      y: reader.center.y - origin.y,
    };
    for (const index of pick(nodes, params.picks, toward(center, radius, from, reader_index))) {
      lit.set(index, index);
      // The leg starts where the link from the card meets the circle, on the reader's side.
      const angle = Math.atan2(from.y - center.y, from.x - center.x);
      const edge = { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
      legs.push(curve(edge, nodes[index]));
    }
  });

  const on = new Set(nodes.map((point) => `${point.x},${point.y}`));
  const hue = params.hue;
  return (
    <svg
      className='dx-cover overflow-visible'
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      data-testid='space-graph-node'
    >
      <circle cx={center.x} cy={center.y} r={radius} className='fill-none stroke-neutral-border' strokeWidth={1.8} />
      {cells
        .filter((cell) => !on.has(`${cell.x},${cell.y}`))
        .map((cell, index) => (
          <circle
            key={`cell-${index}`}
            cx={cell.x}
            cy={cell.y}
            r={Math.max(1.3, nodeR * 0.3)}
            className='fill-neutral-border'
            opacity={0.35}
          />
        ))}
      {links.map(([from, to], index) => (
        <line
          key={`link-${index}`}
          x1={nodes[from].x}
          y1={nodes[from].y}
          x2={nodes[to].x}
          y2={nodes[to].y}
          className='stroke-neutral-border'
          strokeWidth={Math.max(1.6, nodeR * 0.36)}
          opacity={0.6}
        />
      ))}
      {legs.map((d, index) => (
        <path key={`leg-${index}`} d={d} className={`fill-none ${STROKE[hue]}`} strokeWidth={1.8} />
      ))}
      {nodes.map((point, index) => (
        <circle
          key={`object-${index}`}
          cx={point.x}
          cy={point.y}
          r={lit.has(index) ? nodeR + 2.4 : nodeR}
          className={lit.has(index) ? FILL[hue] : 'fill-neutral-border'}
          data-lit={lit.has(index) ? true : undefined}
        />
      ))}
    </svg>
  );
};

export const spaceGraphSpec: ElementKindSpec = {
  name: 'Space graph',
  icon: 'ph--graph--regular',
  key: 'G',
  schema: SpaceGraphNode,
  component: SpaceGraphNodeView,
  create: ({ id, z, center, size }) => ({ type: 'space-graph', id, z, center, size, seed: 7 }),
  defaultSize: { width: 392, height: 392 },
  resizable: true,
  minSize: { width: 120, height: 120 },
  // The frame is the inscribed circle, and the type draws everything it shows: no box, no fill, no border.
  ellipse: true,
  bare: true,
};
