//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { Box } from './common';
import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { createAnchorMap } from '../../components';

export const DatabaseShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('database'),
  }),
);

export type DatabaseShape = S.Schema.Type<typeof DatabaseShape>;

export type CreateDatabaseProps = CreateShapeProps<DatabaseShape>;

export const createDatabase = ({ id, ...rest }: CreateDatabaseProps): DatabaseShape => ({
  id,
  type: 'database',
  size: { width: 128, height: 64 },
  ...rest,
});

export const DatabaseComponent = ({ shape }: ShapeComponentProps<DatabaseShape>) => {
  return <Box shape={shape} />;
};

export const databaseShape: ShapeDef<DatabaseShape> = {
  type: 'database',
  name: 'ECHO',
  icon: 'ph--database--regular',
  component: DatabaseComponent,
  createShape: createDatabase,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};