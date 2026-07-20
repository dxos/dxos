//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ScriptedAiService } from '@dxos/ai/testing';
import { toolNameForOperation } from '@dxos/assistant';
import { Operation } from '@dxos/compute';

/**
 * Builds a scripted turn that calls an operation, deriving the model-facing tool name from the
 * operation (so it can never drift from what the agent registers) and type-checking `input` against
 * the operation's input schema. A field rename or type change on the operation surfaces here as a
 * **compile error** — the property that lets scripted tests evolve with the code.
 *
 * The value is encoded through the operation's input schema to produce the JSON the model emits. For
 * an input the encoder cannot handle (e.g. an exotic transform), fall back to
 * {@link ScriptedAiService.toolCall} with a raw JSON value.
 *
 * @example
 * ```ts
 * operationToolCall(SchemaAdd, { typename: 'example.com/Person', jsonSchema: { type: 'object' } })
 * ```
 */
export const operationToolCall = <Def extends Operation.Definition.Any>(
  operation: Def,
  input: Operation.Definition.Input<Def>,
  options?: Omit<ScriptedAiService.ScriptedTurn, 'tools'>,
): ScriptedAiService.ScriptedTurn =>
  ScriptedAiService.toolCall(toolNameForOperation(operation), Schema.encodeSync(operation.input)(input), options);
