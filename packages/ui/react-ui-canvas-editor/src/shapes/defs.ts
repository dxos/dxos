//
// Copyright 2025 DXOS.org
//

import * as SchemaAST from 'effect/SchemaAST';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';

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
