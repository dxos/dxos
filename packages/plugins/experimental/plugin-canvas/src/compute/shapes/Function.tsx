//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { AST, S } from '@dxos/echo-schema';
import { Icon, IconButton } from '@dxos/react-ui';

import { BaseComputeShape, type BaseComputeShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { useEditorContext } from '../../hooks';
import { createAnchorId, createAnchors, rowHeight } from '../../shapes';
import { DefaultInput, DefaultOutput, RemoteFunction } from '../graph';

const minHeight = 64;

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

  return {
    id,
    type: 'function',
    node,
    size: { width: 128, height: minHeight + properties.length * rowHeight },
    ...rest,
  };
};

/**
 * Generalize to any compute node with anchors.
 */
export const FunctionComponent = ({ shape }: ShapeComponentProps<FunctionShape>) => {
  const { actionHandler, repaint } = useEditorContext();

  const properties = AST.getPropertySignatures(shape.node.input.ast).map(({ name }) => ({
    name: name.toString(),
  }));

  const handleRun = () => {
    void actionHandler?.({ type: 'run', ids: [shape.id] });
  };

  const handleAdd = () => {
    // if (shape.properties.length < maxProperties) {
    //   shape.properties.push({ name: `prop-${shape.properties.length + 1}`, type: 'string' });
    //   shape.size.height = minHeight + shape.properties.length * rowHeight;
    //   // TODO(burdon): Not reactive when pushed or spliced?
    //   repaint();
    // }
  };

  // TODO(burdon): Potentially delete link.
  const handleDelete = (name: string) => {
    // shape.properties.splice(
    //   shape.properties.findIndex((p) => p.name === name),
    //   1,
    // );
    // shape.size.height = minHeight + shape.properties.length * rowHeight;
    repaint();
  };

  return (
    <div className='flex flex-col h-full w-full justify-between'>
      <div className='flex w-full justify-between items-center p-1 border-b border-separator'>
        <IconButton icon='ph--plus--regular' label='play' iconOnly onClick={handleAdd} />
        <IconButton icon='ph--play--regular' label='play' iconOnly onClick={handleRun} />
      </div>
      <div className='p-2'>
        {properties.map(({ name }) => (
          <div key={name} className='group flex text-sm font-mono items-center justify-between'>
            <div>{name}</div>
            <button className='invisible group-hover:visible' onClick={() => handleDelete(name)}>
              <Icon icon='ph--x--regular' size={4} />
            </button>
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
  // TODO(burdon): Reconcile with createAnchors.
  getAnchors: (shape) => {
    // TODO(burdon): Get props from node's schema.
    const inputs = [createAnchorId('input')];
    const outputs = [createAnchorId('output')];
    // TODO(burdon): Offset.
    return createAnchors(shape, inputs, outputs);

    //   return inputs.reduce(
    //     (map, name, i) => {
    //       const input = createAnchorId('input', name);
    //       map[input] = {
    //         id: input,
    //         shape: id,
    //         pos: pointAdd(center, {
    //           x: -size.width / 2,
    //           y: size.height / 2 - (input.length * rowHeight - 2) + i * rowHeight,
    //         }),
    //       };
    //
    //       return map;
    //     },
    //     {
    //       [outputs]: {
    //         id: outputs,
    //         shape: id,
    //         pos: pointAdd(center, { x: size.width / 2, y: 0 }),
    //       },
    //     } as Record<string, Anchor>,
    //   );
  },
};
