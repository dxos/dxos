//
// Copyright 2025 DXOS.org
//

import { AST } from '@effect/schema';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';
import { ObjectId, S } from '@dxos/echo-schema';
import { type MakeOptional } from '@dxos/util';

import { Polygon } from '../../types';

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

export type CreateShapeProps<S extends Polygon> = Omit<MakeOptional<S, 'size'>, 'type' | 'node'>;

export const ComputeShape = S.extend(
  Polygon,
  S.Struct({
    // TODO(burdon): Rename computeNode?
    node: S.optional(ObjectId.annotations({ [AST.DescriptionAnnotationId]: 'Compute node id' })),
  }).pipe(S.mutable),
);

export type ComputeShape = S.Schema.Type<typeof ComputeShape>;