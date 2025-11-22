//
// Copyright 2025 DXOS.org
//

import { Ref as Ref$, RefArray, type RefResolver } from './internal';
import type * as Obj from './Obj';

export type Ref<T> = Ref$<T>;
export type Any = Ref$<Obj.Any>;

export const Ref = Ref$;

export const Array = RefArray;

/**
 * Extract reference target.
 */
export type Target<R extends Any> = R extends Ref$<infer T> ? T : never;

/**
 * Reference resolver.
 */
export type Resolver = RefResolver;

export const isRef: (value: unknown) => value is Any = Ref$.isRef;

export const make = Ref$.make;

// TODO(dmaretskyi): Consider just allowing `make` to accept DXN.
export const fromDXN = Ref$.fromDXN;
