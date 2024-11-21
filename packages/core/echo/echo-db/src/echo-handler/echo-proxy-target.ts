//
// Copyright 2024 DXOS.org
//

import { type Brand } from 'effect';

import type { UnsubscribeCallback } from '@dxos/async';
import { type GenericSignal } from '@dxos/echo-signals/runtime';
import { type ComplexMap } from '@dxos/util';

import { type EchoReactiveObject } from './create';
import { type EchoArray } from './echo-array';
import { type EchoReactiveHandler } from './echo-handler';
import type { ObjectCore, KeyPath } from '../core-db';
import { type EchoDatabase } from '../proxy-db';

export const symbolPath = Symbol('path');
export const symbolNamespace = Symbol('namespace');
export const symbolHandler = Symbol('handler');
export const symbolInternals = Symbol('internals');

/**
 * For tracking proxy targets in the `targetsMap`.
 */
type TargetKey = {
  path: KeyPath;
  namespace: string;
  type: 'record' | 'array';
} & Brand.Brand<'TargetKey'>;

export const TargetKey = {
  /**
   * Constructor function forces the order of the fields.
   */
  new: (path: KeyPath, namespace: string, type: 'record' | 'array'): TargetKey =>
    ({
      path,
      namespace,
      type,
    }) as TargetKey,
  hash: (key: TargetKey): string => JSON.stringify(key),
};

/**
 *
 */
// TODO(burdon): Document.
export type ObjectInternals = {
  /**
   *
   */
  // TODO(burdon): Document.
  core: ObjectCore;

  /**
   * Database.
   * Is set on object adding to database.
   */
  database: EchoDatabase | undefined;

  /**
   *
   */
  // TODO(burdon): Document.
  signal: GenericSignal;

  /**
   * Caching targets based on key path.
   * Only used for records and arrays.
   */
  targetsMap: ComplexMap<TargetKey, ProxyTarget>;

  /**
   * Until object is persisted in the database, the linked object references are stored in this cache.
   * Set only when the object is not bound to a database.
   */
  linkCache: Map<string, EchoReactiveObject<any>> | undefined;

  subscriptions: UnsubscribeCallback[];
};

/**
 * Generic proxy target type for ECHO proxy objects.
 * Targets can either be objects or arrays (instances of `EchoArrayTwoPointO`).
 * @internal
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
   * @deprecated
   */
  // TODO(dmaretskyi): Can be removed.
  [symbolHandler]?: EchoReactiveHandler;
} & ({ [key: keyof any]: any } | EchoArray<any>);
