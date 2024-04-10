//
// Copyright 2022 DXOS.org
//

import type { EchoDatabase } from '../database';
import { type ReactiveObject } from '../effect/reactive';

// TODO(burdon): Don't export symbols outside of package?

// TypedObject
export const schema = Symbol.for('dxos.echo.schema');
export const meta = Symbol.for('dxos.echo.meta');
export const data = Symbol.for('dxos.echo.data'); // TODO(burdon): Document.
export const immutable = Symbol.for('dxos.echo.immutable');

// Misc
export const debug = Symbol.for('dxos.echo.debug');
/**
 * Proxy object detection.
 * Querying this key should return true for ECHO proxy objects.
 */
export const proxy = Symbol.for('dxos.echo.proxy');
export const base = Symbol.for('dxos.echo.base');
export const db = Symbol.for('dxos.echo.db');
export const subscribe = Symbol.for('dxos.echo-object.subscribe');

/**
 * Only needed while we're transitioning from TypedObject to ReactiveObject APIs.
 * To be removed afterwards.
 */
// TODO(dmaretskyi): REMOVE.
export type OpaqueEchoObject = EchoObject | ReactiveObject<any>;

/**
 * Shared interface of all echo objects.
 * May be behind a proxy for key-value documents.
 */
// TODO(dmaretskyi): REMOVE.
export interface EchoObject {
  readonly id: string;

  /**
   * Debug info (ID, schema, etc.)
   */
  [debug]: string;

  /**
   * Returns the underlying object.
   * Same as `this` for non-proxied objects.
   */
  [base]: OpaqueEchoObject;

  /**
   * The database this object belongs to.
   * Returns `undefined` for non-persisted objects.
   */
  [db]: EchoDatabase | undefined;

  /**
   * @param callback
   * @returns Unsubscribe function.
   */
  // TODO(dmaretskyi): Document `value`.
  [subscribe](callback: (value: any) => void): () => void;
}

/**
 * Reference to an object in a foreign database.
 */
export type ForeignKey = {
  /**
   * Name of the foreign database/system.
   * E.g. `github.com`.
   */
  source?: string;

  /**
   * Id within the foreign database.
   */
  id?: string;
};

/**
 * Echo object metadata.
 */
export type ObjectMeta = {
  /**
   * Foreign keys.
   */
  keys: ForeignKey[];
};

/**
 * Base properties of all typed echo objects.
 */
// TODO(dmaretskyi): Merge with `EchoObject` after automerge migration.
// TODO(dmaretskyi): REMOVE.
export interface TypedObjectProperties extends EchoObject {
  /**
   * Fully qualified name of the object type for objects created from the schema.
   */
  readonly __typename: string | undefined;

  /**
   * Object metadata.
   */
  readonly __meta: ObjectMeta | undefined;

  /**
   * Deletion marker.
   */
  readonly __deleted: boolean;

  /**
   * Returns a JSON-compatible representation of the object.
   */
  toJSON(): any;
}
