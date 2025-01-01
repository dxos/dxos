//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { AST, S } from '@dxos/echo-schema';
import { IconButton } from '@dxos/react-ui';

import { BaseComputeShape, type BaseComputeShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { useEditorContext } from '../../hooks';
import { pointAdd } from '../../layout';
import { createAnchorId, createAnchors, rowHeight } from '../../shapes';
import { DefaultInput, DefaultOutput, RemoteFunction } from '../graph';

const headerHeight = 40;
const bodyPadding = 8;

export const FunctionProperty = S.Struct({
  name: S.String,
  // TODO(burdon): Use echo definitions?
  type: S.Union(
    //
    S.Literal('string'),
    S.Literal('number'),
    S.Literal('boolean'),
  ),
});

export const FunctionShape = S.extend(
  BaseComputeShape,
  S.Struct({
    type: S.Literal('function'),
  }),
);

export type FunctionProperty = S.Schema.Type<typeof FunctionProperty>;
export type FunctionShape = S.Schema.Type<typeof FunctionShape>;

export type CreateFunctionProps = Omit<BaseComputeShapeProps<RemoteFunction<any, any>>, 'size'>;

// TODO(burdon): How is it selected?

export const createFunction = ({ id, ...rest }: CreateFunctionProps): FunctionShape => {
  const node = new RemoteFunction(DefaultInput, DefaultOutput);
  const properties = AST.getPropertySignatures(DefaultInput.ast);
  const height = headerHeight + bodyPadding * 2 + properties.length * rowHeight + 3; // 3 = borders.

  return {
    id,
    type: 'function',
    node,
    size: { width: 128, height },
    ...rest,
  };
};

/**
 * Generalize to any compute node with anchors.
 */
export const FunctionComponent = ({ shape }: ShapeComponentProps<FunctionShape>) => {
  const { actionHandler } = useEditorContext();
  const inputs = AST.getPropertySignatures(shape.node.input.ast).map(({ name }) => name.toString());

  const handleRun = () => {
    void actionHandler?.({ type: 'run', ids: [shape.id] });
  };

  return (
    <div className='flex flex-col h-full w-full justify-between'>
      <div className='flex w-full justify-between items-center p-1 border-b border-separator'>
        <IconButton icon='ph--play--regular' label='play' iconOnly onClick={handleRun} />
      </div>
      {/* TODO(burdon): Abs position next to anchors. */}
      <div style={{ padding: bodyPadding }}>
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
    const inputs = AST.getPropertySignatures(shape.node.input.ast).map(({ name }) =>
      createAnchorId('input', name.toString()),
    );
    const outputs = AST.getPropertySignatures(shape.node.output.ast).map(({ name }) =>
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
