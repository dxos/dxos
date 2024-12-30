//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';
import { Icon } from '@dxos/react-ui';

import { getAnchors, type ShapeComponentProps, type ShapeDef } from '../../components';
import { createId } from '../../testing';
import { Polygon } from '../../types';

export const AndShape = S.extend(
  Polygon,
  S.Struct({
    type: S.Literal('and'),
  }),
);

export type AndShape = S.Schema.Type<typeof AndShape>;

export type CreateAndProps = Omit<AndShape, 'type'>;

export const createAnd = ({ id, ...rest }: CreateAndProps): AndShape => ({
  id,
  type: 'and',
  ...rest,
});

export const AndComponent = ({ shape }: ShapeComponentProps<AndShape>) => {
  return (
    <div className='flex w-full justify-center items-center'>
      <Icon icon='ph--intersection--regular' size={6} />
    </div>
  );
};

export const andShape: ShapeDef<AndShape> = {
  type: 'and',
  icon: 'ph--intersection--regular',
  component: AndComponent,
  create: () => createAnd({ id: createId(), center: { x: 0, y: 0 }, size: { width: 64, height: 64 } }),
  getAnchors: (shape) =>
    getAnchors(shape, {
      'input.a': { x: -1, y: -0.25 }, // TODO(burdon): Reuse Function layout using schema.
      'input.b': { x: -1, y: 0.25 },
      'output.#default': { x: 1, y: 0 },
    }),
};
