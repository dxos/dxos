//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { ComputeShape } from './defs';
import { createAnchors, type ShapeComponentProps, type ShapeDef } from '../../components';
import { createAnchorId } from '../../shapes';
import { Calculator } from '../graph';

export const CalculatorShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('calculator'),
  }),
);

export type CalculatorShape = ComputeShape<S.Schema.Type<typeof CalculatorShape>, Calculator>;

export type CreateCalculatorProps = Omit<CalculatorShape, 'type' | 'node' | 'size'>;

export const createCalculator = ({ id, ...rest }: CreateCalculatorProps): CalculatorShape => ({
  id,
  type: 'calculator',
  node: new Calculator(),
  size: { width: 64, height: 64 },
  ...rest,
});

export const CalculatorComponent = ({ shape }: ShapeComponentProps<CalculatorShape>) => {
  // Signals value.
  const value = shape.node.state.value;

  return <div className='flex w-full justify-center items-center'>{value}</div>;
};

export const calculatorShape: ShapeDef<CalculatorShape> = {
  type: 'calculator',
  icon: 'ph--calculator--regular',
  component: CalculatorComponent,
  createShape: createCalculator,
  getAnchors: (shape) => createAnchors(shape, { [createAnchorId('input')]: { x: -1, y: 0 } }),
};
