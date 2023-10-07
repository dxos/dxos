//
// Copyright 2022 DXOS.org
//

import type { EchoDatabase } from "./database";
import { EchoObjectBase } from "./echo-object-base";
import { Schema } from "./proto";
import { EchoSchemaType } from "./schema";

// TypedObject
export const schema = Symbol.for('dxos.echo.schema');
export const meta = Symbol.for('dxos.echo.meta');
export const data = Symbol.for('dxos.echo.data');
export const immutable = Symbol.for('dxos.echo.immutable');

// Misc
export const proxy = Symbol.for('dxos.echo.proxy');
export const base = Symbol.for('dxos.echo.base');
export const db = Symbol.for('dxos.echo.db');
export const subscribe = Symbol.for('dxos.echo-object.subscribe');

/**
 * Shared interface of all echo objects.
 * May be behind a proxy for key-value documents.
 */
export interface EchoObject {
  readonly id: string;

  /**
   * 
   * @param callback 
   * @returns Unsubscribe function.
   */
  // TODO(dmaretskyi): Document `value`.
  [subscribe](callback: (value: any) => void): () => void;

  /**
   * Returns the underlying object.
   * Same as `this` for non-proxied objects.
   */
  [base]: EchoObjectBase;

  /**
   * The database this object belongs to.
   * Returns `undefined` for non-persisted objects.
   */
  [db]: EchoDatabase | undefined;
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

  /**
   * Positional index in a list.
   * @deprecated
   */
  index?: string;
};

/**
 * Base properties of all typed echo objects.
 */
export interface TypedObjectProperties extends EchoObject {
  /**
   * String name of the object type.
   */
  readonly __typename: string | undefined; 

  /**
   * Object schema.
   * Can be a reference to a dynamic schema persisted in ECHO or a static one generated at compile-time.
   */
  readonly __schema: EchoSchemaType | Schema | undefined;

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

