//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

//
// Base types
//

export const createInputSchema = (schema: Schema.Schema.AnyNoContext): Schema.Schema.AnyNoContext =>
  Schema.Struct({ [DEFAULT_INPUT]: schema });
export const createOutputSchema = (schema: Schema.Schema.AnyNoContext): Schema.Schema.AnyNoContext =>
  Schema.Struct({ [DEFAULT_OUTPUT]: schema });

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

export const DefaultInput = Schema.Struct({ [DEFAULT_INPUT]: Schema.Any });
export const DefaultOutput = Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Any });

export type DefaultInput<T> = { [DEFAULT_INPUT]: T };
export type DefaultOutput<T> = { [DEFAULT_OUTPUT]: T };

//
// Void
//

export const VoidInput = Schema.Struct({});
export const VoidOutput = Schema.Struct({});

export type VoidInput = Schema.Schema.Type<typeof VoidInput>;
export type VoidOutput = Schema.Schema.Type<typeof VoidOutput>;

//
// Any
//

export const AnyInput = Schema.Struct({ [DEFAULT_INPUT]: Schema.Any });
export const AnyOutput = Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Any });

export type AnyInput = Schema.Schema.Type<typeof AnyInput>;
export type AnyOutput = Schema.Schema.Type<typeof AnyOutput>;
