//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { AST, S } from '@dxos/echo-schema';

import { Box, footerHeight, headerHeight } from './components';
import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { createAnchors, rowHeight } from '../../components';
import { type Polygon } from '../../types';
import { DEFAULT_INPUT, DEFAULT_OUTPUT, Function } from '../graph';

const DefaultInput = S.Struct({ [DEFAULT_INPUT]: S.Any });
const DefaultOutput = S.Struct({ [DEFAULT_OUTPUT]: S.Any });

export const FunctionShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('function'),
  }),
);

export type FunctionShape = ComputeShape<S.Schema.Type<typeof FunctionShape>, Function<any, any>>;

export type CreateFunctionProps = CreateShapeProps<FunctionShape>;

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
  return (
    <FunctionBody name={shape.node.name} inputSchema={shape.node.inputSchema} outputSchema={shape.node.outputSchema} />
  );
};

export const functionShape: ShapeDef<FunctionShape> = {
  type: 'function',
  icon: 'ph--function--regular',
  component: FunctionComponent,
  createShape: createFunction,
  getAnchors: (shape) => createFunctionAnchors(shape, shape.node.inputSchema, shape.node.outputSchema),
};

//
// Common function components.
//

const bodyPadding = 8;

// TODO(burdon): Move labels to anchor?
export const FunctionBody = ({
  name,
  inputSchema,
  outputSchema,
}: {
  name: string;
  inputSchema: S.Schema.Any;
  outputSchema: S.Schema.Any;
}) => {
  const inputs = AST.getPropertySignatures(inputSchema.ast).map(({ name }) => name.toString());
  const outputs = AST.getPropertySignatures(outputSchema.ast).map(({ name }) => name.toString());

  return (
    <Box name={name} classNames='grid grid-cols-2 items-center'>
      <div className='flex flex-col' style={{ padding: bodyPadding }}>
        {inputs?.map((name) => (
          <div key={name} className='truncate text-sm font-mono items-center' style={{ height: rowHeight }}>
            {name}
          </div>
        ))}
      </div>
      <div className='flex flex-col' style={{ padding: bodyPadding }}>
        {outputs?.map((name) => (
          <div key={name} className='truncate  text-sm font-mono items-center text-right' style={{ height: rowHeight }}>
            {name}
          </div>
        ))}
      </div>
    </Box>
  );
};

export const getHeight = (input: S.Schema<any>) => {
  const properties = AST.getPropertySignatures(input.ast);
  return headerHeight + footerHeight + bodyPadding * 2 + properties.length * rowHeight + 2; // Incl. borders.
};

export const createFunctionAnchors = (shape: Polygon, input: S.Schema<any>, output: S.Schema<any>) => {
  const inputs = AST.getPropertySignatures(input.ast).map(({ name }) => createAnchorId('input', name.toString()));
  const outputs = AST.getPropertySignatures(output.ast).map(({ name }) => createAnchorId('output', name.toString()));
  return createAnchors({ shape, inputs, outputs, center: { x: 0, y: (headerHeight - footerHeight) / 2 + 1 } });
};
