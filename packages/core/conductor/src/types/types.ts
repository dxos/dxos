//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

//
// Default
//

export const DEFAULT_INPUT = 'input';
export const DEFAULT_OUTPUT = 'result';

export const DefaultInput = S.Struct({ [DEFAULT_INPUT]: S.Any });
export const DefaultOutput = S.Struct({ [DEFAULT_OUTPUT]: S.Any });

export type DefaultInput<T> = { [DEFAULT_INPUT]: T };
export type DefaultOutput<T> = { [DEFAULT_OUTPUT]: T };

//
// Void
//

export const VoidInput = S.Struct({});
export const VoidOutput = S.Struct({});

export type VoidInput = S.Schema.Type<typeof VoidInput>;
export type VoidOutput = S.Schema.Type<typeof VoidOutput>;
