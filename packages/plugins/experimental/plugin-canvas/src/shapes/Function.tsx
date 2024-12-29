//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';
import { Icon, IconButton } from '@dxos/react-ui';

import { type Anchor, type ShapeComponentProps, type ShapeDef } from '../components';
import { useEditorContext } from '../hooks';
import { pointAdd } from '../layout';
import { createId } from '../testing';
import { Polygon } from '../types';

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
  Polygon,
  S.Struct({
    type: S.Literal('function'),
    // TODO(burdon): These data should be in the graph structure (not UX)?
    properties: S.mutable(S.Array(FunctionProperty)),
  }),
);

export type FunctionProperty = S.Schema.Type<typeof FunctionProperty>;
export type FunctionShape = S.Schema.Type<typeof FunctionShape>;

export type CreateFunctionProps = Omit<FunctionShape, 'type' | 'properties'>;

export const createFunction = ({ id, ...rest }: CreateFunctionProps): FunctionShape => ({
  id,
  type: 'function',
  // TODO(burdon): Effect schema for input and output.
  properties: [
    {
      name: 'prop-1',
      type: 'string',
    },
  ],
  ...rest,
});

const minHeight = 64;
const rowHeight = 20;
const maxProperties = 8;

/**
 * Generalize to any compute node with anchors.
 */
export const FunctionComponent = ({ shape }: ShapeComponentProps<FunctionShape>) => {
  const { actionHandler, repaint } = useEditorContext();

  const handleRun = () => {
    void actionHandler?.({ type: 'run', id: shape.id });
  };

  const handleAdd = () => {
    if (shape.properties.length < maxProperties) {
      shape.properties.push({ name: `prop-${shape.properties.length + 1}`, type: 'string' });
      shape.size.height = minHeight + shape.properties.length * rowHeight;
      // TODO(burdon): Not reactive when pushed or spliced?
      repaint();
    }
  };

  // TODO(burdon): Potentially delete link.
  const handleDelete = (name: string) => {
    shape.properties.splice(
      shape.properties.findIndex((p) => p.name === name),
      1,
    );
    shape.size.height = minHeight + shape.properties.length * rowHeight;
    repaint();
  };

  return (
    <div className='flex flex-col h-full w-full justify-between'>
      <div className='flex w-full justify-between items-center p-1 border-b border-separator'>
        <IconButton icon='ph--plus--regular' label='play' iconOnly onClick={handleAdd} />
        <IconButton icon='ph--play--regular' label='play' iconOnly onClick={handleRun} />
      </div>
      {/* TODO(burdon): Draggable list. */}
      <div className='p-2'>
        {shape.properties.map(({ name }) => (
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
  create: () => createFunction({ id: createId(), center: { x: 0, y: 0 }, size: { width: 192, height: 80 } }),
  getAnchors: ({ id, center, size, properties }) => {
    return properties.reduce(
      (map, { name }, i) => {
        map[name] = {
          id: name,
          shape: id,
          pos: pointAdd(center, {
            x: -size.width / 2,
            y: size.height / 2 - (properties.length * rowHeight - 2) + i * rowHeight,
          }),
        };

        return map;
      },
      {
        '#output': {
          // TODO(burdon): Const.
          id: '#output',
          shape: id,
          pos: pointAdd(center, { x: size.width / 2, y: 0 }),
        },
      } as Record<string, Anchor>,
    );
  },
};
