//
// Copyright 2026 DXOS.org
//

//
// One ECHO space as a canvas element kind: a circle holding a connected graph of objects on a hexagonal lattice,
// generated from a seed. It began as a slide of the studio deck, drawn there by a Generator; as a kind its fields are
// its configuration, so the seed, the density and the hue are edited in the Properties panel rather than written into
// a parameter blob. The geometry is the same module either way (`generator/space-graph.generator.ts`), so the golden check
// covers both.
//
// What a kind still cannot do: anchor a link to an object *inside* it. A `Port` sits on a side of the frame at an
// offset, so there is no port at an interior point. The canvas link therefore ends on the circle.
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { type ElementKindSpec, type NodeViewProps, kindData } from '@dxos/react-ui-canvas';
import { DEFAULT_LAYOUT_NAME, FormLayoutAnnotation, StepAnnotation } from '@dxos/react-ui-form';
import { Scene } from '@dxos/scene';

import { layout } from './generator/space-graph.generator.ts';

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

/**
 * What a graph draws with where a field is unset. Each is also the field's `default` in the schema, which is what the
 * Properties panel shows for an unset field, so the panel and the drawing cannot disagree.
 */
const DEFAULTS = { pitch: 26, fill: 0.6, extra: 0.45, size: 24, hue: 'neutral' } as const;

export const graphFields = {
  /** Same seed, same graph. */
  seed: Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)).annotate({ title: 'Seed' }),
  /** Distance between neighbouring lattice points, in scene units: how far apart the objects sit. */
  pitch: Schema.optional(
    Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 8, maximum: 120 })).annotate({
      title: 'Spacing',
      default: DEFAULTS.pitch,
    }),
  ),
  /** Share of the lattice that becomes objects (0–1): how full the space is. */
  fill: Schema.optional(
    Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 }))
      .annotate({ title: 'Node density', default: DEFAULTS.fill })
      .pipe(StepAnnotation.set(0.05)),
  ),
  /** Chance that each neighbouring pair beyond the spanning tree is linked (0–1): how connected the graph is. */
  extra: Schema.optional(
    Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 }))
      .annotate({ title: 'Link density', default: DEFAULTS.extra })
      .pipe(StepAnnotation.set(0.05)),
  ),
  /** Object radius as a percentage of pitch. */
  size: Schema.optional(
    Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 5, maximum: 50 })).annotate({
      title: 'Object size',
      default: DEFAULTS.size,
    }),
  ),
  /** The graph's colour. */
  hue: Schema.optional(Schema.Literals(HUES).annotate({ title: 'Hue', default: DEFAULTS.hue })),
  /** Whether the lattice points that hold no object are drawn, as faint dots under the graph; unset, they are not. */
  dots: Schema.optional(Schema.Boolean.annotate({ title: 'Base dots' })),
};

/** The kind's own fields, kept under `data`: they share names with the element (`size`) and its style (`fill`, `hue`). */
export const GraphData = Schema.Struct(graphFields).pipe(
  // Two to a row, each pair of a kind: what is drawn, how far apart, and how full.
  FormLayoutAnnotation.set({
    [DEFAULT_LAYOUT_NAME]: `<grid cols="2" fixed="true">${['seed', 'hue', 'pitch', 'size', 'fill', 'extra', 'dots']
      .map((name) => `<field name="${name}"/>`)
      .join('')}</grid>`,
  }),
);

export const GraphNode = Schema.Struct({
  ...Scene.Element2D.fields,
  type: Schema.Literal('space-graph'),
  data: GraphData,
});

export const GraphNodeView = ({ node }: NodeViewProps) => {
  const data = kindData(GraphData, node);
  if (!data) {
    return null;
  }

  const params = { ...DEFAULTS, ...data };
  const { width, height } = node.size;
  // Local coordinates: the circle is inscribed in the node's frame, so the graph moves and resizes with the node.
  const center = { x: width / 2, y: height / 2 };
  const radius = Math.min(width, height) / 2;
  const { cells, nodes, links, nodeR } = layout(center, radius, params);

  const on = new Set(nodes.map((point) => `${point.x},${point.y}`));
  const hue = params.hue;
  return (
    <svg
      className='dx-cover overflow-visible'
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      data-testid='graph-node'
    >
      {(data.dots ? cells : [])
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
      {nodes.map((point, index) => (
        <circle key={`object-${index}`} cx={point.x} cy={point.y} r={nodeR} className={FILL[hue]} />
      ))}
    </svg>
  );
};

export const graphSpec: ElementKindSpec = {
  name: 'Graph',
  icon: 'ph--graph--regular',
  key: 'G',
  schema: GraphNode,
  component: GraphNodeView,
  create: ({ id, z, center, size }) => ({ type: 'space-graph', id, z, center, size, data: { seed: 7 } }),
  // Nominal units (one unit is the major grid cell, 48px): the deck's 392-unit circle, give or take.
  defaultSize: { width: 8, height: 8 },
  resizable: true,
  minSize: { width: 120, height: 120 },
  // The frame is the inscribed circle and its border is the space's ring, so Border, the hue and the line style are
  // the ring's, and it takes no fill unless asked for one.
  ellipse: true,
  outline: true,
};
