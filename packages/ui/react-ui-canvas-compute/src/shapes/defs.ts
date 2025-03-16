//
// Copyright 2025 DXOS.org
//

import { SchemaAST as AST } from 'effect';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';
import { ObjectId, S } from '@dxos/echo-schema';
import { Polygon } from '@dxos/react-ui-canvas-editor';
import { type MakeOptional } from '@dxos/util';

//
// Properties
//

export type PropertyKind = 'input' | 'output';

export const getProperties = (ast: AST.AST) =>
  AST.getPropertySignatures(ast).map(({ name }) => ({ name: name.toString() }));

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

export const ComputeShape = S.extend(
  Polygon,
  S.Struct({
    // TODO(burdon): Rename computeNode?
    node: S.optional(ObjectId.annotations({ [AST.DescriptionAnnotationId]: 'Compute node id' })),
  }).pipe(S.mutable),
);

export type ComputeShape = S.Schema.Type<typeof ComputeShape>;

export const createShape = <S extends ComputeShape>({ id, ...rest }: CreateShapeProps<S> & { type: string }): S => {
  return {
    id: id ?? ObjectId.random(),
    ...rest,
  } as S;
};
