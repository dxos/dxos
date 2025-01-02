//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { AST, S } from '@dxos/echo-schema';
import { IconButton } from '@dxos/react-ui';

import { ComputeShape } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { pointAdd } from '../../layout';
import { createAnchorId, createAnchors, rowHeight } from '../../shapes';
import { DefaultInput, DefaultOutput, RemoteFunction } from '../graph';

const headerHeight = 32;
const bodyPadding = 8;

export const FunctionProperty = S.Struct({
  name: S.String,
  // TODO(burdon): Use echo definitions.
  type: S.Union(
    //
    S.Literal('string'),
    S.Literal('number'),
    S.Literal('boolean'),
  ),
});

export const FunctionShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('function'),
  }),
);

export type FunctionProperty = S.Schema.Type<typeof FunctionProperty>;

export type FunctionShape = ComputeShape<S.Schema.Type<typeof FunctionShape>, RemoteFunction<any, any>>;

export type CreateFunctionProps = Omit<FunctionShape, 'type' | 'node' | 'size'>;

export const createFunction = ({ id, ...rest }: CreateFunctionProps): FunctionShape => {
  const node = new RemoteFunction(DefaultInput, DefaultOutput);
  const properties = AST.getPropertySignatures(DefaultInput.ast);
  const height = headerHeight + bodyPadding * 2 + properties.length * rowHeight + 2; // Incl. borders.

  return {
    id,
    type: 'function',
    node,
    size: { width: 192, height },
    ...rest,
  };
};

/**
 * Generalize to any compute node with anchors.
 */
export const FunctionComponent = ({ shape }: ShapeComponentProps<FunctionShape>) => {
  const inputs = AST.getPropertySignatures(shape.node.inputSchema.ast).map(({ name }) => name.toString());

  return (
    <div className='flex flex-col h-full w-full justify-between'>
      <div className='flex w-full justify-between items-center h-[32px] bg-hoverSurface'>
        <div className='ps-2 text-sm truncate'>{shape.node.name}</div>
        <IconButton classNames='p-1' variant='ghost' icon='ph--gear-six--regular' size={4} label='settings' iconOnly />
      </div>
      <div className='flex flex-col' style={{ padding: bodyPadding }}>
        {inputs.map((name) => (
          <div key={name} className='flex text-sm font-mono items-center' style={{ height: rowHeight }}>
            <div>{name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const functionShape: ShapeDef<FunctionShape> = {
  type: 'function',
  icon: 'ph--function--regular',
  component: FunctionComponent,
  createShape: createFunction,
  getAnchors: (shape) => {
    const inputs = AST.getPropertySignatures(shape.node.inputSchema.ast).map(({ name }) =>
      createAnchorId('input', name.toString()),
    );
    const outputs = AST.getPropertySignatures(shape.node.outputSchema.ast).map(({ name }) =>
      createAnchorId('output', name.toString()),
    );

    return createAnchors({
      shape,
      inputs,
      outputs,
      center: pointAdd(shape.center, { x: 0, y: headerHeight / 2 }),
    });
  },
};
