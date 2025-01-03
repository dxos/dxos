//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { AST, S } from '@dxos/echo-schema';

import { Box } from './components';
import { ComputeShape } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { pointAdd } from '../../layout';
import { createAnchorId, createAnchors, rowHeight } from '../../shapes';
import { type Polygon } from '../../types';
import { DefaultInput, DefaultOutput, Function } from '../graph';

export const FunctionShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('function'),
  }),
);

export type FunctionShape = ComputeShape<S.Schema.Type<typeof FunctionShape>, Function<any, any>>;

export type CreateFunctionProps = Omit<FunctionShape, 'type' | 'node' | 'size'>;

export const createFunction = ({ id, ...rest }: CreateFunctionProps): FunctionShape => {
  return {
    id,
    type: 'function',
    node: new Function(DefaultInput, DefaultOutput),
    size: { width: 192, height: getHeight(DefaultInput) },
    ...rest,
  };
};

export const FunctionComponent = ({ shape }: ShapeComponentProps<FunctionShape>) => {
  const inputs = AST.getPropertySignatures(shape.node.inputSchema.ast).map(({ name }) => name.toString());
  return <FunctionBody name={shape.node.name} inputs={inputs} />;
};

export const functionShape: ShapeDef<FunctionShape> = {
  type: 'function',
  icon: 'ph--function--regular',
  component: FunctionComponent,
  createShape: createFunction,
  getAnchors: (shape) => getAnchors(shape, shape.node.inputSchema, shape.node.outputSchema),
};

//
// Common function components.
//

const headerHeight = 32;
const bodyPadding = 8;

export const FunctionBody = ({ name, inputs }: { name: string; inputs: string[] }) => {
  // TODO(burdon): Consider moving property labels to the Anchor component? Or use anchor positions.
  return (
    <Box name={name}>
      <div className='flex flex-col' style={{ padding: bodyPadding }}>
        {inputs.map((name) => (
          <div key={name} className='flex text-sm font-mono items-center' style={{ height: rowHeight }}>
            <div>{name}</div>
          </div>
        ))}
      </div>
    </Box>
  );
};

export const getHeight = (input: S.Schema<any>) => {
  const properties = AST.getPropertySignatures(input.ast);
  return headerHeight + bodyPadding * 2 + properties.length * rowHeight + 2; // Incl. borders.
};

export const getAnchors = (shape: Polygon, input: S.Schema<any>, output: S.Schema<any>) => {
  const inputs = AST.getPropertySignatures(input.ast).map(({ name }) => createAnchorId('input', name.toString()));
  const outputs = AST.getPropertySignatures(output.ast).map(({ name }) => createAnchorId('output', name.toString()));
  return createAnchors({
    shape,
    inputs,
    outputs,
    center: pointAdd(shape.center, { x: 0, y: headerHeight / 2 }),
  });
};
