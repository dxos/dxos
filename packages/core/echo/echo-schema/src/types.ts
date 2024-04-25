//
// Copyright 2024 DXOS.org
//

export const data = Symbol.for('dxos.echo.data');

export const TYPE_PROPERTIES = 'dxos.sdk.client.Properties';

/**
 * Reactive object.
 * Accessing properties triggers signal semantics.
 */
// This type doesn't change the shape of the object, it is rather used as an indicator that the object is reactive.
export type ReactiveObject<T> = { [K in keyof T]: T[K] };

/**
 * Has `id`.
 */
export interface Identifiable {
  readonly id: string;
}

/**
 * Reference to another ECHO object.
 */
export type Ref<T> = T | undefined;

export type EchoReactiveObject<T> = ReactiveObject<T> & Identifiable;

/**
 * Reference to an object in a foreign database.
 */
export type ForeignKey = {
  /**
   * Name of the foreign database/system.
   * g. `github.com`.
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
