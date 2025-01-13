//
// Copyright 2025 DXOS.org
//

import { AST } from '@effect/schema';

import { S } from '@dxos/echo-schema';
import { type MakeOptional, type Specialize } from '@dxos/util';

import { Polygon } from '../../types';
import { DEFAULT_INPUT, DEFAULT_OUTPUT, type ComputeNode } from '../graph';

//
// Properties
//

export type PropertyKind = 'input' | 'output';

export const getProperties = (kind: PropertyKind, ast: AST.AST) =>
  AST.getPropertySignatures(ast).map(({ name }) => createAnchorId(kind, name.toString()));

export const createAnchorId = (kind: PropertyKind, property = kind === 'input' ? DEFAULT_INPUT : DEFAULT_OUTPUT) =>
  [kind, property].join('.');

export const parseAnchorId = (id: string): [PropertyKind | undefined, string] => {
  const parts = id.match(/(input|output)\.(.+)/);
  return parts ? (parts.slice(1) as any) : [undefined, id];
};

//
// Schema
//

export const createInputSchema = (schema: S.Schema<any>): S.Schema<any> => S.Struct({ [DEFAULT_INPUT]: schema });
export const createOutputSchema = (schema: S.Schema<any>): S.Schema<any> => S.Struct({ [DEFAULT_OUTPUT]: schema });

export type InputType<INPUT = any> = {
  [DEFAULT_INPUT]: INPUT;
};

export type OutputType<OUTPUT = any> = {
  [DEFAULT_OUTPUT]: OUTPUT;
};

//
// Shapes
//

export type CreateShapeProps<S extends Polygon> = Omit<MakeOptional<S, 'size'>, 'type' | 'node'>;

export const ComputeShape = S.extend(
  Polygon,
  S.Struct({
    node: S.String,
  }),
);

export type ComputeShape = S.Schema.Type<typeof ComputeShape>;
