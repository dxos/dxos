//
// Copyright 2025 DXOS.org
//

import * as EchoSchema from '@dxos/echo-schema';

import type * as Obj from './Obj';

export type Any = EchoSchema.Ref<Obj.Any>;

export const make = EchoSchema.Ref.make;

export const isRef: (value: unknown) => value is Any = EchoSchema.Ref.isRef;

// TODO(dmaretskyi): Consider just allowing `make` to accept DXN.
export const fromDXN = EchoSchema.Ref.fromDXN;

/**
 * Extract reference target.
 */
export type Target<R extends Any> = R extends EchoSchema.Ref<infer T> ? T : never;

/**
 * Reference resolver.
 */
export type Resolver = EchoSchema.RefResolver;
