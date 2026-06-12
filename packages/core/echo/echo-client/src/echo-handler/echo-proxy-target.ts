//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';

import type { Event } from '@dxos/async';
import { inspectCustom } from '@dxos/debug';
import type { Entity, Type } from '@dxos/echo';
import type { SchemaId } from '@dxos/echo/internal';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { EventId } from '@dxos/echo/internal';

import type { KeyPath, ObjectCore, TargetKey } from '../core-db';
import { type EchoArray } from './echo-array';
import { type EchoReactiveHandler } from './echo-handler';

export const symbolPath = Symbol('path');
export const symbolNamespace = Symbol('namespace');
export const symbolHandler = Symbol('handler');
export const symbolInternals = Symbol('internals');

// Re-export TargetKey from core-db so echo-handler callers only need this module.
export { TargetKey } from '../core-db';

/**
 * Generic proxy target type for ECHO proxy objects.
 * `[symbolInternals]` points directly at the `ObjectCore` (entity-core),
 * which now holds all fields previously in `ObjectInternals`.
 * @internal
 */
export type ProxyTarget = {
  [symbolInternals]: ObjectCore;

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

  /**
   * For modifications.
   */
  [EventId]: Event<void>;
} & ({ [key: keyof any]: any } | EchoArray<any>);

/**
 * Returns a string label for an ObjectCore used in inspection output.
 * @internal
 */
export const coreInspectLabel = (core: ObjectCore): string => `ObjectCore(${core.id}${core.database ? ' bound' : ''})`;

// ---------------------------------------------------------------------------
// EchoDatabase accessor — the database field on ObjectCore is `unknown` to
// avoid a circular dep between core-db ← proxy-db. This module bridges the
// two layers: it imports EchoDatabase and exposes a typed getter.
// ---------------------------------------------------------------------------

import type { EchoDatabase } from '../proxy-db';

/**
 * Typed accessor for the EchoDatabase stored on an ObjectCore.
 * The field is `unknown` on ObjectCore to avoid a circular dep; this module
 * bridges the two layers.
 */
export const getEchoDatabase = (core: ObjectCore): EchoDatabase | undefined =>
  core.database as EchoDatabase | undefined;
