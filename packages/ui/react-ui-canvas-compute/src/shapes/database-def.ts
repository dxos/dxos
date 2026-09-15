//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { type ShapeDef } from '@dxos/react-ui-canvas-editor';
import { createAnchorMap } from '@dxos/react-ui-canvas-editor';

import { DatabaseComponent } from './Database.tsx';
import { ComputeShape, type CreateShapeProps, createAnchorId, createShape } from './defs.ts';

// Kept out of `Database.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

export const DatabaseShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('database'),
  }),
);

export type DatabaseShape = Schema.Schema.Type<typeof DatabaseShape>;

export type CreateDatabaseProps = CreateShapeProps<DatabaseShape>;

export const createDatabase = (props: CreateDatabaseProps) =>
  createShape<DatabaseShape>({ type: 'database', size: { width: 128, height: 64 }, ...props });

export const databaseShape: ShapeDef<DatabaseShape> = {
  type: 'database',
  name: 'ECHO',
  icon: 'ph--database--regular',
  component: DatabaseComponent,
  createShape: createDatabase,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};
