//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { S } from '@dxos/echo-schema';

import { createAnchors, getAnchorPoints } from './util';
import { type ShapeDef } from '../../components';
import { createId } from '../../testing';
import { Polygon } from '../../types';

//
// Gate utils.
// https://en.wikipedia.org/wiki/Logic_gate
//

type GateType = 'and' | 'or' | 'not';

const GateShape = S.extend(
  Polygon,
  S.Struct({
    type: S.String,
  }),
);

type GateShape = S.Schema.Type<typeof GateShape>;

type CreateGateProps = Omit<GateShape, 'type'> & { type: GateType };

const createGate = ({ id, type, ...rest }: CreateGateProps): GateShape => ({
  id,
  type,
  ...rest,
});

const GateComponent = (Symbol: FC<GateSymbolProps>) => () => {
  return (
    <div className='flex w-full justify-center items-center'>
      <Symbol />
    </div>
  );
};

// TODO(burdon): Create custom icons.
const gateShape = (
  type: GateType,
  icon: string,
  Symbol: FC<GateSymbolProps>,
  inputs: string[],
): ShapeDef<GateShape> => ({
  type,
  icon,
  component: GateComponent(Symbol),
  create: () => createGate({ id: createId(), type, center: { x: 0, y: 0 }, size: { width: 64, height: 64 } }),
  getAnchors: (shape) => createAnchors(shape, inputs, ['output.#default']),
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
  ({ width = 64, height = 32, className = 'fill-white dark:fill-black stroke-separator', strokeWidth = 1 }) => {
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
export const createAnd = (props: GateShape) => createGate({ ...props, type: 'and' });
export const andShape = gateShape('and', 'ph--intersection--regular', AndSymbol, ['input.a', 'input.b']);

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
export const createOr = (props: GateShape) => createGate({ ...props, type: 'or' });
export const orShape = gateShape('or', 'ph--union--regular', OrSymbol, ['input.a', 'input.b']);

//
// NOTE
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
export const createNot = (props: GateShape) => createGate({ ...props, type: 'not' });
export const notShape = gateShape('not', 'ph--x--regular', NotSymbol, ['input.#default']);
