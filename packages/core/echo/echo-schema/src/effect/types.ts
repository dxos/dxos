//
// Copyright 2024 DXOS.org
//

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
