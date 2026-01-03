//
// Copyright 2023 DXOS.org
//

import { type Node } from '@dxos/app-graph';
import { type MaybePromise, type Position } from '@dxos/util';

// TODO(wittjosiah): Factor out.
export type SerializedNode = {
  name: string;
  data: string;
  type?: string;
};

// TODO(wittjosiah): Factor out.
export type NodeSerializer<T = any> = {
  inputType: string;
  outputType: string;
  position?: Position;

  /**
   * Takes a node and serializes it into a format that can be stored.
   */
  serialize: (node: Node.Node<T>) => MaybePromise<SerializedNode>;

  /**
   * Takes a serialized node and deserializes it into the application.
   */
  deserialize: (data: SerializedNode, ancestors: unknown[]) => MaybePromise<T>;
};
