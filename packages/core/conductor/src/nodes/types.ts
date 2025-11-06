//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ObjectId } from '@dxos/echo/internal';
import { Message } from '@dxos/types';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '../types';

// TODO(burdon): Split up node defs and move types to separate lib package?

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
