//
// Copyright 2025 DXOS.org
//

import * as EchoSchema from './internal';
import type * as Obj from './Obj';

export type Ref<T> = EchoSchema.Ref<T>;
export type Any = EchoSchema.Ref<Obj.Any>;

export const Array = EchoSchema.RefArray;

/**
 * Extract reference target.
 */
export type Target<R extends Any> = R extends EchoSchema.Ref<infer T> ? T : never;

/**
 * Reference resolver.
 */
export type Resolver = EchoSchema.RefResolver;

export const isRef: (value: unknown) => value is Any = EchoSchema.Ref.isRef;

export const make = EchoSchema.Ref.make;

// TODO(dmaretskyi): Consider just allowing `make` to accept DXN.
export const fromDXN = EchoSchema.Ref.fromDXN;
