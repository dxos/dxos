//
// Copyright 2024 DXOS.org
//

import type * as Brand from 'effect/Brand';
import type * as Schema from 'effect/Schema';

import type { CleanupFn } from '@dxos/async';
import { inspectCustom } from '@dxos/debug';
import type { SchemaId } from '@dxos/echo/internal';
import { type GenericSignal, compositeRuntime } from '@dxos/echo-signals/runtime';
import { ComplexMap } from '@dxos/util';

import type { KeyPath, ObjectCore } from '../core-db';
import { type EchoDatabase } from '../proxy-db';

import { type EchoArray } from './echo-array';
import { type AnyLiveObject, type EchoReactiveHandler } from './echo-handler';

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
 * Internal state for the proxy ECHO object.
 * Shared for the entire ECHO object in the database (maybe be composed of multiple proxies for each subrecord).
 */
export class ObjectInternals {
  /**
   * Backing ECHO object core.
   */
  core: ObjectCore;

  /**
   * Database.
   * Is set on object adding to database.
   */
  database: EchoDatabase | undefined;

  /**
   * Signal for reactive updates to the object.
   */
  signal: GenericSignal = compositeRuntime.createSignal();

  /**
   * Caching targets based on key path.
   * Only used for records and arrays.
   */
  targetsMap = new ComplexMap<TargetKey, ProxyTarget>((key) => JSON.stringify(key));

  /**
   * Until object is persisted in the database, the linked object references are stored in this cache.
   * Set only when the object is not bound to a database.
   */
  linkCache: Map<string, AnyLiveObject<any>> | undefined = new Map<string, AnyLiveObject<any>>();

  subscriptions: CleanupFn[] = [];

  /**
   * Schema of the root object.
   * Only used if this is not bound to a database.
   */
  rootSchema?: Schema.Schema.AnyNoContext = undefined;

  constructor(core: ObjectCore, database?: EchoDatabase) {
    this.core = core;
    this.database = database;
  }

  [inspectCustom] = () => `ObjectInternals(${this.core.id}${this.database ? ' bound' : ''})`;
}

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

  /**
   * Used for objects created by `createObject`.
   */
  [SchemaId]?: Schema.Schema.AnyNoContext;
} & ({ [key: keyof any]: any } | EchoArray<any>);
