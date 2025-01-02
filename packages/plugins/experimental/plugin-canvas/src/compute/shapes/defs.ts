//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { Polygon } from '../../types';
import { type ComputeNode } from '../graph';

export const ComputeShape = S.extend(
  Polygon,
  S.Struct({
    // Runtime-only compute node (not persistent).
    // TODO(burdon): Is this the best way to represent a generic runtime object?
    node: S.Any as S.Schema<ComputeNode<any, any>, unknown, never>,
  }),
);

export type BaseComputeShape = S.Schema.Type<typeof ComputeShape>;

export type ComputeShape<S extends BaseComputeShape, Node extends ComputeNode<any, any>> = Omit<S, 'node'> & {
  node: Node;
};
