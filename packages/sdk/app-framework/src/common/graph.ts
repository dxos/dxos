//
// Copyright 2023 DXOS.org
//

import type { Node } from '@dxos/app-graph';
import { type MaybePromise } from '@dxos/util';

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
  disposition?: 'hoist' | 'fallback';

  /**
   * Takes a node and serializes it into a format that can be stored.
   */
  serialize: (node: Node<T>) => MaybePromise<SerializedNode>;

  /**
   * Takes a serialized node and deserializes it into the application.
   */
  deserialize: (data: SerializedNode, ancestors: unknown[]) => MaybePromise<T>;
};
