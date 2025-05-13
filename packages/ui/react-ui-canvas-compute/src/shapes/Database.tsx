//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import React from 'react';

import { type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';
import { createAnchorMap } from '@dxos/react-ui-canvas-editor';

import { Box } from './common';
import { ComputeShape, createAnchorId, createShape, type CreateShapeProps } from './defs';

export const DatabaseShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('database'),
  }),
);

export type DatabaseShape = Schema.Schema.Type<typeof DatabaseShape>;

export type CreateDatabaseProps = CreateShapeProps<DatabaseShape>;

export const createDatabase = (props: CreateDatabaseProps) =>
  createShape<DatabaseShape>({ type: 'database', size: { width: 128, height: 64 }, ...props });

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
