//
// Copyright 2024 DXOS.org
//

import type { ComplexMap } from '@dxos/util';

import { type EchoArray } from './echo-array';
import { type EchoReactiveHandler } from './echo-handler';
import type { AutomergeObjectCore } from '../automerge';
import type { KeyPath } from '../automerge/key-path';

export const symbolPath = Symbol('path');
export const symbolNamespace = Symbol('namespace');
export const symbolHandler = Symbol('handler');
export const symbolInternals = Symbol('internals');

export type ObjectInternals = {
  core: AutomergeObjectCore;

  /**
   * Caching targets based on key path.
   * Only used for records and arrays.
   */
  // TODO(dmaretskyi): We need to include data type in the map key. it's safe for typed objects since fields cannot change from record to array and vice versa, but its gonna be a bug for untyped objects.
  targetsMap: ComplexMap<KeyPath, ProxyTarget>;
};

/**
 * Generic proxy target type for ECHO handler.
 * Targets can either be objects or arrays (instances of `EchoArrayTwoPointO`).
 * Every targets holds a set of hidden properties on symbols.
 */
export type ProxyTarget = {
  [symbolInternals]: ObjectInternals;
  /**
   * `data` or `meta` namespace.
   */
  [symbolNamespace]: string;

  /**
   * Path within the namespace.
   *
   * Root objects have an empty path: `[]`.
   */
  [symbolPath]: KeyPath;

  /**
   * Reference to the handler.
   */
  // TODO(dmaretskyi): Can be removed.
  [symbolHandler]?: EchoReactiveHandler;
} & ({ [key: keyof any]: any } | EchoArray<any>);
