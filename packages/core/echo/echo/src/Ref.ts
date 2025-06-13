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
