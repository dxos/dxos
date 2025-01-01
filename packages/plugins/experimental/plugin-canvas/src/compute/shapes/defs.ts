//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { Polygon } from '../../types';
import { type ComputeNode } from '../graph';

export const BaseComputeShape = S.extend(
  Polygon,
  S.Struct({
    // Compute node.
    // TODO(burdon): Is this the best way to represent a generic runtime object?
    node: S.Any as S.Schema<ComputeNode<any, any>, unknown, never>,
  }),
);

export type BaseComputeShape<Node extends ComputeNode<any, any>> = Omit<
  S.Schema.Type<typeof BaseComputeShape>,
  'node'
> & {
  node: Node;
};

export type BaseComputeShapeProps<Node extends ComputeNode<any, any>> = Omit<BaseComputeShape<Node>, 'type' | 'node'>;
