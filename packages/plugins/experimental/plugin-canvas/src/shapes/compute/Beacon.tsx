//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';
import { Icon } from '@dxos/react-ui';

import { getAnchors, type ShapeComponentProps, type ShapeDef } from '../../components';
import { createId } from '../../testing';
import { Polygon } from '../../types';

export const BeaconShape = S.extend(
  Polygon,
  S.Struct({
    type: S.Literal('beacon'),
  }),
);

export type BeaconShape = S.Schema.Type<typeof BeaconShape>;

export type CreateBeaconProps = Omit<BeaconShape, 'type'>;

export const createBeacon = ({ id, ...rest }: CreateBeaconProps): BeaconShape => ({
  id,
  type: 'beacon',
  ...rest,
});

export const BeaconComponent = ({ shape }: ShapeComponentProps<BeaconShape>) => {
  return (
    <div className='flex w-full justify-center items-center'>
      <Icon icon='ph--sun--regular' size={6} />
    </div>
  );
};

export const beaconShape: ShapeDef<BeaconShape> = {
  type: 'beacon',
  icon: 'ph--sun--regular',
  component: BeaconComponent,
  create: () => createBeacon({ id: createId(), center: { x: 0, y: 0 }, size: { width: 64, height: 64 } }),
  getAnchors: (shape) => getAnchors(shape, { 'input.#default': { x: -1, y: 0 } }),
};
