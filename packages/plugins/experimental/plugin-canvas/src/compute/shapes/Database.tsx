//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { Box } from './components';
import { ComputeShape } from './defs';
import { createAnchors, type ShapeComponentProps, type ShapeDef } from '../../components';
import { createAnchorId } from '../../shapes';
import { Database } from '../graph';

export const DatabaseShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('database'),
  }),
);

export type DatabaseShape = ComputeShape<S.Schema.Type<typeof DatabaseShape>, Database>;

export type CreateDatabaseProps = Omit<DatabaseShape, 'type' | 'node' | 'size'>;

export const createDatabase = ({ id, ...rest }: CreateDatabaseProps): DatabaseShape => ({
  id,
  type: 'database',
  node: new Database(),
  size: { width: 128, height: 64 },
  ...rest,
});

export const DatabaseComponent = ({ shape }: ShapeComponentProps<DatabaseShape>) => {
  return <Box name={'Database'}></Box>;
};

export const databaseShape: ShapeDef<DatabaseShape> = {
  type: 'database',
  icon: 'ph--database--regular',
  component: DatabaseComponent,
  createShape: createDatabase,
  getAnchors: (shape) => createAnchors(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};
