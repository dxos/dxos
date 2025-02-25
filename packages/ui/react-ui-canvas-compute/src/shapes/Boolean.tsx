//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { S } from '@dxos/echo-schema';
import { type ShapeDef } from '@dxos/react-ui-canvas-editor';
import { createAnchors, getAnchorPoints } from '@dxos/react-ui-canvas-editor';

import { ComputeShape, createAnchorId, createShape, type CreateShapeProps } from './defs';

//
// Gate utils.
// https://en.wikipedia.org/wiki/Logic_gate
//

type GateType = 'and' | 'or' | 'not';

const GateShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.String,
  }),
);

type GateShape = S.Schema.Type<typeof GateShape>;

type CreateGateProps = CreateShapeProps<GateShape> & { type: GateType };

const createGate = (props: CreateGateProps): GateShape =>
  createShape<GateShape>({
    size: { width: 64, height: 64 },
    ...props,
  });

const GateComponent = (Symbol: FC<GateSymbolProps>) => () => {
  return (
    <div className='flex w-full justify-center items-center'>
      <Symbol />
    </div>
  );
};

// TODO(burdon): Create custom icons.
const defineShape = <S extends GateShape>({
  type,
  name,
  icon,
  Symbol,
  createShape,
  inputs,
  outputs = [createAnchorId('output')],
}: {
  type: GateType;
  Symbol: FC<GateSymbolProps>;
  createShape: ShapeDef<S>['createShape'];
  inputs: string[];
  outputs?: string[];
} & Pick<ShapeDef<GateShape>, 'name' | 'icon'>): ShapeDef<GateShape> => ({
  type,
  name,
  icon,
  component: GateComponent(Symbol),
  createShape,
  getAnchors: (shape) => createAnchors({ shape, inputs, outputs }),
});

//
// Symbols
//

type PathConstructor = (props: { startX: number; endX: number; height: number }) => string[];

type GateSymbolProps = {
  width?: number;
  height?: number;
  className?: string;
  strokeWidth?: number;
};

// TODO(burdon): Note inputs should line up with anchors.
const Symbol =
  (pathConstructor: PathConstructor, inputs: number): FC<GateSymbolProps> =>
  ({
    width = 64,
    height = 32,
    // TODO(burdon): Same as line color.
    className = 'fill-neutral-200 dark:fill-neutral-800 stroke-neutral-500',
    strokeWidth = 1,
  }) => {
    const startX = width * 0.25;
    const endX = width * 0.75;
    const centerY = height / 2;
    const paths = pathConstructor({ startX, endX, height });

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className='w-full h-full'>
        {/* Input line. */}
        {getAnchorPoints({ x: 0, y: centerY }, inputs).map(({ x, y }, i) => (
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

const AndSymbol = Symbol(({ startX, endX, height }) => {
  const arcRadius = (endX - startX) / 2;
  return [
    `
    M ${startX},${height * 0.1}
    L ${endX - arcRadius},${height * 0.1}
    A ${arcRadius},${height * 0.4} 0 0 1 ${endX - arcRadius},${height * 0.9}
    L ${startX},${height * 0.9}
    Z
  `,
  ];
}, 2);

export const AndShape = GateShape;
export type AndShape = GateShape;

export const createAnd = (props: Omit<CreateGateProps, 'type' | 'node'>) => {
  return createGate({ ...props, type: 'and' });
};
export const andShape = defineShape({
  type: 'and',
  name: 'AND',
  icon: 'ph--intersection--regular',
  Symbol: AndSymbol,
  createShape: createAnd,
  inputs: ['input.a', 'input.b'],
});

//
// OR
//

// TODO(burdon): Should have sharper point.
const OrSymbol = Symbol(({ startX, endX, height }) => {
  const arcRadius = (endX - startX) / 2;
  return [
    `
    M ${startX},${height * 0.1}
    L ${endX - arcRadius},${height * 0.1}
    A ${arcRadius},${height * 0.4} 0 0 1 ${endX - arcRadius},${height * 0.9}
    L ${startX},${height * 0.9}
    C ${startX * 1.4},${height * 0.5} ${startX * 1.4},${height * 0.5} ${startX},${height * 0.1}
    Z
  `,
  ];
}, 2);

export const OrShape = GateShape;
export type OrShape = GateShape;

export const createOr = (props: Omit<CreateGateProps, 'type' | 'node'>) => {
  return createGate({ ...props, type: 'or' });
};
export const orShape = defineShape({
  type: 'or',
  name: 'OR',
  icon: 'ph--union--regular',
  Symbol: OrSymbol,
  createShape: createOr,
  inputs: ['input.a', 'input.b'],
});

//
// NOT
//

const NotSymbol = Symbol(({ startX, endX, height }) => {
  return [
    `
    M ${startX},${height * 0.1}
    L ${endX * 0.9},${height * 0.5}
    L ${startX},${height * 0.9}
    Z
    `,
    `
    M ${endX - height * 0.2},${height * 0.5}
    A ${height * 0.1} ${height * 0.1} 0 0 1 ${endX},${height * 0.5}
    A ${height * 0.1} ${height * 0.1} 0 0 1 ${endX - height * 0.2},${height * 0.5}
    Z
  `,
  ];
}, 1);

export const NotShape = GateShape;
export type NotShape = GateShape;

export const createNot = (props: Omit<CreateGateProps, 'type' | 'node'>) => {
  return createGate({ ...props, type: 'not' });
};
export const notShape = defineShape({
  type: 'not',
  name: 'NOT',
  icon: 'ph--x--regular',
  Symbol: NotSymbol,
  createShape: createNot,
  inputs: [createAnchorId('input')],
});
