//
// Copyright 2025 DXOS.org
//

import { isProxy } from './proxy/proxy';

// This odd construct only serves one purpose: when you hover over `const x: Live<T>` you'd see `Live<T>` type.
interface _Live {}

/**
 * Live reactive object marker interface (does not change the shape of the object.)
 * Accessing properties triggers signal semantics.
 *
 * It is recommended to use explicitly use this type when expecting reactive semantics, e.g. `Live<MyObject>`.
 * One common use case includes React components.
 */
export type Live<T> = _Live & T;

/**
 * @returns true if the value is a reactive object.
 */
export const isLiveObject = (value: unknown): boolean => isProxy(value);
