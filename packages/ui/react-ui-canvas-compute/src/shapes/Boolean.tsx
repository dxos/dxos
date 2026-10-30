//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import React, { type CSSProperties, type FC } from 'react';

import { type NodeDef } from '@dxos/react-ui-canvas/scene';
import { DEFAULT_GRID } from '@dxos/scene';

import { createRowPorts, defineComputeNode, getRowPoints } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createAnchorId, createShape, withZ } from './defs.ts';

//
// Gate utils.
// https://en.wikipedia.org/wiki/Logic_gate
//

type GateType = 'and' | 'or' | 'not';

const GateShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.String,
  }),
);

type GateShape = Schema.Schema.Type<typeof GateShape>;

type CreateGateProps = CreateShapeProps<GateShape> & { type: GateType };

const createGate = (props: CreateGateProps): GateShape =>
  createShape<GateShape>({
    size: { width: 64, height: 64 },
    ...props,
  });

// TODO(burdon): Create custom icons.
const defineGate = ({
  type,
  name,
  icon,
  symbol: Symbol,
  create,
  inputs,
  outputs = [createAnchorId('output')],
}: {
  type: GateType;
  symbol: FC<GateSymbolProps>;
  create: (props: Pick<GateShape, 'id' | 'center'>) => GateShape;
  inputs: string[];
  outputs?: string[];
} & Pick<NodeDef, 'name' | 'icon'>): NodeDef =>
  defineComputeNode<GateShape>({
    type,
    name,
    icon,
    group: 'Operations',
    schema: withZ(GateShape),
    // NOTE: Preact interprets captitalized properties as React components.
    // Be careful not to name component factories with a capital letter.
    component: ({ node }) => <Symbol size={node.size} />,
    create,
    ports: (shape) => createRowPorts({ size: shape.size, inputs, outputs }),
  });

//
// Symbols
//

/** The body's horizontal span and its top, middle and bottom, in the node's coordinates. */
type PathConstructor = (props: { startX: number; endX: number; top: number; mid: number; bottom: number }) => string[];

/** The body is three minor grid units tall whatever the node's height, spanning the two input rows. */
const BODY_HEIGHT = 3 * DEFAULT_GRID;

const OUTER_BOX: CSSProperties = {
  top: 'calc(-1 * var(--scene-frame-border, 2px))',
  left: 'calc(-1 * var(--scene-frame-border, 2px))',
  width: 'calc(100% + 2 * var(--scene-frame-border, 2px))',
  height: 'calc(100% + 2 * var(--scene-frame-border, 2px))',
};

type GateSymbolProps = {
  /** The node's size in scene px; the symbol is drawn in the node's own coordinates, so its lines meet the ports. */
  size: { width: number; height: number };
  className?: string;
  strokeWidth?: number;
};

const createSymbol =
  (pathConstructor: PathConstructor, inputs: number): FC<GateSymbolProps> =>
  ({
    size: { width, height },
    // TODO(burdon): Same as line color.
    className = 'fill-neutral-200 dark:fill-neutral-800 stroke-neutral-500',
    strokeWidth = 2,
  }) => {
    const startX = width * 0.25;
    const endX = width * 0.75;
    const centerY = height / 2;
    const paths = pathConstructor({
      startX,
      endX,
      top: centerY - BODY_HEIGHT / 2,
      mid: centerY,
      bottom: centerY + BODY_HEIGHT / 2,
    });

    return (
      // Over the node's outer box rather than inside its border, so the viewBox is the node's own coordinates and the
      // input lines meet the ports exactly.
      <svg viewBox={`0 0 ${width} ${height}`} className='absolute' style={OUTER_BOX}>
        {/* Input lines, at the rows `createRowPorts` puts the input ports on. */}
        {getRowPoints({ x: 0, y: centerY }, inputs).map(({ x, y }, i) => (
          <line key={i} x1={x} y1={y} x2={startX * 1.3} y2={y} strokeWidth={strokeWidth} className={className} />
        ))}

        {/* Output line. */}
        <line x1={endX} y1={centerY} x2={width} y2={centerY} strokeWidth={strokeWidth} className={className} />

        {/* And body. */}
        {paths.map((path, i) => (
          <path key={i} d={path} strokeWidth={strokeWidth} className={className} />
        ))}
      </svg>
    );
  };

//
// AND
//

const AndSymbol = createSymbol(({ startX, endX, top, bottom }) => {
  const arcRadius = (endX - startX) / 2;
  return [
    `
    M ${startX},${top}
    L ${endX - arcRadius},${top}
    A ${arcRadius},${(bottom - top) / 2} 0 0 1 ${endX - arcRadius},${bottom}
    L ${startX},${bottom}
    Z
  `,
  ];
}, 2);

export const AndShape = GateShape;
export type AndShape = GateShape;

export const createAnd = (props: Omit<CreateGateProps, 'type' | 'node'>) => {
  return createGate({ ...props, type: 'and' });
};
export const andNodeDef = defineGate({
  type: 'and',
  name: 'AND',
  icon: 'ph--intersection--regular',
  symbol: AndSymbol,
  create: createAnd,
  inputs: ['input.a', 'input.b'],
});

//
// OR
//

// TODO(burdon): Should have sharper point.
const OrSymbol = createSymbol(({ startX, endX, top, mid, bottom }) => {
  const arcRadius = (endX - startX) / 2;
  return [
    `
    M ${startX},${top}
    L ${endX - arcRadius},${top}
    A ${arcRadius},${(bottom - top) / 2} 0 0 1 ${endX - arcRadius},${bottom}
    L ${startX},${bottom}
    C ${startX * 1.4},${mid} ${startX * 1.4},${mid} ${startX},${top}
    Z
  `,
  ];
}, 2);

export const OrShape = GateShape;
export type OrShape = GateShape;

export const createOr = (props: Omit<CreateGateProps, 'type' | 'node'>) => {
  return createGate({ ...props, type: 'or' });
};
export const orNodeDef = defineGate({
  type: 'or',
  name: 'OR',
  icon: 'ph--union--regular',
  symbol: OrSymbol,
  create: createOr,
  inputs: ['input.a', 'input.b'],
});

//
// NOT
//

const NotSymbol = createSymbol(({ startX, endX, top, mid, bottom }) => {
  const bubble = (bottom - top) * 0.125;
  return [
    `
    M ${startX},${top}
    L ${endX - 2 * bubble},${mid}
    L ${startX},${bottom}
    Z
    `,
    `
    M ${endX - 2 * bubble},${mid}
    A ${bubble} ${bubble} 0 0 1 ${endX},${mid}
    A ${bubble} ${bubble} 0 0 1 ${endX - 2 * bubble},${mid}
    Z
  `,
  ];
}, 1);

export const NotShape = GateShape;
export type NotShape = GateShape;

export const createNot = (props: Omit<CreateGateProps, 'type' | 'node'>) => {
  return createGate({ ...props, type: 'not' });
};
export const notNodeDef = defineGate({
  type: 'not',
  name: 'NOT',
  icon: 'ph--x--regular',
  symbol: NotSymbol,
  create: createNot,
  inputs: [createAnchorId('input')],
});
