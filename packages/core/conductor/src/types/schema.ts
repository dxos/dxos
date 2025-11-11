//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ObjectId } from '@dxos/echo/internal';
import { Message } from '@dxos/types';

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

//
// Constant
//

// TODO(burdon): Define type.
export const Scalar = Schema.Union(Schema.String, Schema.Number, Schema.Boolean);

export const ConstantOutput = Schema.Struct({ [DEFAULT_OUTPUT]: Scalar });

//
// Queue
//

export const QueueInput = Schema.Struct({ [DEFAULT_INPUT]: ObjectId });
export const QueueOutput = Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Array(Message.Message) });

//
// Function
//

export const FunctionInput = Schema.Struct({ [DEFAULT_INPUT]: Schema.Any });
export type FunctionInput = Schema.Schema.Type<typeof FunctionInput>;

//
// Data
//

export const JsonTransformInput = Schema.Struct({ [DEFAULT_INPUT]: Schema.Any, expression: Schema.String });
export type JsonTransformInput = Schema.Schema.Type<typeof JsonTransformInput>;

export const AppendInput = Schema.Struct({ id: ObjectId, items: Schema.Any });
export type AppendInput = Schema.Schema.Type<typeof AppendInput>;

// export const DatabaseOutput = Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Array(Tool) });
// export type DatabaseOutput = Schema.Schema.Type<typeof DatabaseOutput>;

//
// Logic
//

export const IfInput = Schema.mutable(Schema.Struct({ condition: Schema.Boolean, value: Schema.Any }));
export type IfInput = Schema.Schema.Type<typeof IfInput>;

export const IfOutput = Schema.mutable(
  Schema.Struct({ true: Schema.optional(Schema.Any), false: Schema.optional(Schema.Any) }),
);
export type IfOutput = Schema.Schema.Type<typeof IfOutput>;

export const IfElseInput = Schema.mutable(
  Schema.Struct({ condition: Schema.Boolean, true: Schema.Any, false: Schema.Any }),
);
export type IfElseInput = Schema.Schema.Type<typeof IfElseInput>;

export const IfElseOutput = Schema.mutable(Schema.Struct({ [DEFAULT_OUTPUT]: Schema.optional(Schema.Any) }));
export type IfElseOutput = Schema.Schema.Type<typeof IfElseOutput>;

//
// Reducer
//

export const ReducerInput = Schema.mutable(Schema.Struct({ values: Schema.Array(Schema.Any) }));
export type ReducerInput = Schema.Schema.Type<typeof ReducerInput>;

export const ReducerOutput = Schema.mutable(Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Any }));
export type ReducerOutput = Schema.Schema.Type<typeof ReducerOutput>;

//
// GPT Tools
//

// export const TextToImageOutput = Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Array(Tool) });
