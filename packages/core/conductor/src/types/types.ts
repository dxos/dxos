//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

//
// Base types
//

export const createInputSchema = (schema: S.Schema.AnyNoContext): S.Schema.AnyNoContext =>
  S.Struct({ [DEFAULT_INPUT]: schema });
export const createOutputSchema = (schema: S.Schema.AnyNoContext): S.Schema.AnyNoContext =>
  S.Struct({ [DEFAULT_OUTPUT]: schema });

export type InputType<INPUT = any> = {
  [DEFAULT_INPUT]: INPUT;
};

export type OutputType<OUTPUT = any> = {
  [DEFAULT_OUTPUT]: OUTPUT;
};

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

//
// Any
//

export const AnyInput = S.Struct({ [DEFAULT_INPUT]: S.Any });
export const AnyOutput = S.Struct({ [DEFAULT_OUTPUT]: S.Any });

export type AnyInput = S.Schema.Type<typeof AnyInput>;
export type AnyOutput = S.Schema.Type<typeof AnyOutput>;
