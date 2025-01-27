//
// Copyright 2025 DXOS.org
//

import { DescriptionAnnotationId } from 'effect/SchemaAST';

import { LLMTool, Message, type ResultStreamEvent } from '@dxos/assistant';
import { ObjectId, S } from '@dxos/echo-schema';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '../types';
import { StreamSchema } from '../util';

// TODO(burdon): Split up node defs and move types to separate lib package?

//
// Constant
//

// TODO(burdon): Define type.
export const Scalar = S.Union(S.String, S.Number, S.Boolean);
export const ConstantOutput = S.Struct({ [DEFAULT_OUTPUT]: Scalar });

//
// Queue
//

export const QueueInput = S.Struct({ [DEFAULT_INPUT]: ObjectId });
export const QueueOutput = S.Struct({ [DEFAULT_OUTPUT]: S.Array(Message) });

//
// Function
//

export const FunctionInput = S.Struct({
  [DEFAULT_INPUT]: S.Any,
  function: S.String.annotations({ [DescriptionAnnotationId]: 'Function DXN' }),
});
export type FunctionInput = S.Schema.Type<typeof FunctionInput>;

export const TemplateInput = S.Record({ key: S.String, value: S.Any });
export type TemplateInput = S.Schema.Type<typeof TemplateInput>;

export const TemplateOutput = S.Struct({ [DEFAULT_OUTPUT]: S.String });
export type TemplateOutput = S.Schema.Type<typeof TemplateOutput>;

//
// Data
//

export const JsonTransformInput = S.Struct({ [DEFAULT_INPUT]: S.Any, expression: S.String });
export type JsonTransformInput = S.Schema.Type<typeof JsonTransformInput>;

export const AppendInput = S.Struct({ id: ObjectId, items: S.Array(Message) });
export type AppendInput = S.Schema.Type<typeof AppendInput>;

// TODO(burdon): Generalize LLMTool?
export const DatabaseOutput = S.Struct({ [DEFAULT_OUTPUT]: S.Array(LLMTool) });
export type DatabaseOutput = S.Schema.Type<typeof DatabaseOutput>;

//
// Logic
//

export const IfInput = S.mutable(S.Struct({ condition: S.Boolean, value: S.Any }));
export type IfInput = S.Schema.Type<typeof IfInput>;

export const IfOutput = S.mutable(S.Struct({ true: S.optional(S.Any), false: S.optional(S.Any) }));
export type IfOutput = S.Schema.Type<typeof IfOutput>;

export const IfElseInput = S.mutable(S.Struct({ condition: S.Boolean, true: S.Any, false: S.Any }));
export type IfElseInput = S.Schema.Type<typeof IfElseInput>;

export const IfElseOutput = S.mutable(S.Struct({ [DEFAULT_OUTPUT]: S.optional(S.Any) }));
export type IfElseOutput = S.Schema.Type<typeof IfElseOutput>;

//
// Reducer
//

export const ReducerInput = S.mutable(S.Struct({ values: S.Array(S.Any) }));
export type ReducerInput = S.Schema.Type<typeof ReducerInput>;

export const ReducerOutput = S.mutable(S.Struct({ [DEFAULT_OUTPUT]: S.Any }));
export type ReducerOutput = S.Schema.Type<typeof ReducerOutput>;

//
// Trigger
//

// TODO(burdon): Reuse trigger schema from @dxos/functions (TriggerType).
export const EmailTriggerOutput = S.mutable(
  S.Struct({
    from: S.String,
    to: S.String,
    subject: S.String,
    created: S.String,
    body: S.String,
  }),
);

export const WebhookTriggerOutput = S.mutable(
  S.Struct({
    url: S.String,
    method: S.Literal('GET', 'POST'),
    headers: S.Record({ key: S.String, value: S.String }),
    bodyText: S.String,
  }),
);

export const SubscriptionTriggerOutput = S.mutable(S.Struct({ type: S.String, changedObjectId: S.String }));

export const TimerTriggerOutput = S.mutable(S.Struct({ [DEFAULT_OUTPUT]: S.Any }));

//
// GPT
//

const GptStreamEventSchema = S.Any as S.Schema<ResultStreamEvent>;

export const GptMessage = S.Struct({
  role: S.Union(S.Literal('system'), S.Literal('user'), S.Literal('assistant')),
  message: S.String,
});

export type GptMessage = S.Schema.Type<typeof GptMessage>;

export const GptInput = S.Struct({
  systemPrompt: S.optional(S.String),
  prompt: S.String,
  model: S.optional(S.String),
  tools: S.optional(S.Array(LLMTool)),
  history: S.optional(S.Array(Message)),
});

export type GptInput = S.Schema.Type<typeof GptInput>;

export const GptOutput = S.Struct({
  messages: S.Array(Message),
  artifact: S.optional(S.Any),
  text: S.String,
  cot: S.optional(S.String),
  tokenStream: StreamSchema(GptStreamEventSchema),
  tokenCount: S.Number,
});

export type GptOutput = S.Schema.Type<typeof GptOutput>;

//
// GPT Tools
//

export const TextToImageOutput = S.Struct({ [DEFAULT_OUTPUT]: S.Array(LLMTool) });
