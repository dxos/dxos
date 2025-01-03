//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '../../shapes';
import { Polygon } from '../../types';
import { type ComputeNode } from '../graph';

export const ComputeShape = S.extend(
  Polygon,
  S.Struct({
    // Runtime-only compute node (not persistent).
    // TODO(burdon): Is this the best way to represent a generic runtime object? (See below).
    node: S.Any as S.Schema<ComputeNode<any, any>, unknown, never>,
  }),
);

export type BaseComputeShape = S.Schema.Type<typeof ComputeShape>;

export type ComputeShape<S extends BaseComputeShape, Node extends ComputeNode<any, any>> = Omit<S, 'node'> & {
  node: Node;
};

export const createInputSchema = (schema: S.Schema<any>): S.Schema<any> => S.Struct({ [DEFAULT_INPUT]: schema });
export const createOutputSchema = (schema: S.Schema<any>): S.Schema<any> => S.Struct({ [DEFAULT_OUTPUT]: schema });

export type InputType<INPUT = any> = {
  [DEFAULT_INPUT]: INPUT;
};

export type OutputType<OUTPUT = any> = {
  [DEFAULT_OUTPUT]: OUTPUT;
};

// export const Node = <T extends S.Schema.AnyNoContext>(properties: T) =>
//   S.Struct({
//     id: S.String,
//     properties,
//   });
//
// const FunctionNode = Node(
//   S.Struct({
//     name: S.String,
//   }),
// );
//
// const AnyNode = Node(S.Any);
