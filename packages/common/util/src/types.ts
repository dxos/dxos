//
// Copyright 2020 DXOS.org
//

export type MaybePromise<T> = T | Promise<T>

/**
 * Unwrap a promise type.
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * All types that evaluate to false when cast to a boolean.
 */
export type Falsy = false | 0 | '' | null | undefined
