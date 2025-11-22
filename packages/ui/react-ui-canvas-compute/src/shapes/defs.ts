//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';
import { ObjectId } from '@dxos/keys';
import { Polygon } from '@dxos/react-ui-canvas-editor';
import { type MakeOptional } from '@dxos/util';

//
// Properties
//

export type PropertyKind = 'input' | 'output';

export const getProperties = (ast: SchemaAST.AST) =>
  SchemaAST.getPropertySignatures(ast).map(({ name }) => ({ name: name.toString() }));

export const createAnchorId = (kind: PropertyKind, property = kind === 'input' ? DEFAULT_INPUT : DEFAULT_OUTPUT) =>
  [kind, property].join('.');

export const parseAnchorId = (id: string): [PropertyKind | undefined, string] => {
  const parts = id.match(/(input|output)\.(.+)/);
  return parts ? (parts.slice(1) as any) : [undefined, id];
};

//
// Shapes
//

export type CreateShapeProps<S extends Polygon> = Omit<MakeOptional<S, 'id' | 'size'>, 'type' | 'node'>;

export const ComputeShape = Schema.extend(
  Polygon,
  Schema.Struct({
    // TODO(burdon): Rename computeNode?
    node: Schema.optional(ObjectId.annotations({ description: 'Compute node id' })),
  }).pipe(Schema.mutable),
);

export type ComputeShape = Schema.Schema.Type<typeof ComputeShape>;

export const createShape = <S extends ComputeShape>({ id, ...rest }: CreateShapeProps<S> & { type: string }): S => {
  return {
    id: id ?? ObjectId.random(),
    ...rest,
  } as S;
};
