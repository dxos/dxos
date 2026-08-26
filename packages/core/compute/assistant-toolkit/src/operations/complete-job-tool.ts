//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Tool from 'effect/unstable/ai/Tool';

import { JsonSchema } from '@dxos/echo';

/** `Instructions.make` defaults `output` to `Schema.Void`; this is what that serializes to. */
const UNDECLARED_OUTPUT = JsonSchema.toJsonSchema(Schema.Void);
const UNDECLARED_TYPE = 'type' in UNDECLARED_OUTPUT ? UNDECLARED_OUTPUT.type : undefined;

/**
 * Whether the routine's stored output carries a payload contract. `Instructions` keeps only the
 * serialized schema, so a declared `null` output is indistinguishable from a defaulted one — and
 * wants the same tool either way, having no payload to validate.
 */
const isUndeclaredOutput = (output: JsonSchema.JsonSchema): boolean =>
  ('$id' in output && output.$id === '/schemas/unknown') || ('type' in output && output.type === UNDECLARED_TYPE);

/**
 * Accepts any JSON value, unlike `Schema.Any`, while serializing to concrete types. This matters
 * twice: the Anthropic API rejects a strict tool whose schema contains the empty `{}` subschema
 * `Schema.Any` serializes to, and — observed live — a schema-less `success` invites the model to
 * emit invalid JSON (digit-separated numbers such as `3,628,800`), which kills the sub-agent.
 * `ObjectKeyword` rather than `Record(String, Any)`: the provider's structured-output codec
 * rewrites records into [key, value] tuples whose value member is again the empty schema.
 */
const JsonPayload = Schema.Union([
  Schema.String,
  Schema.Number,
  Schema.Boolean,
  Schema.ObjectKeyword,
  Schema.Array(Schema.Any),
]);

/** The parameters `completeJob` decodes: the declared output (or any JSON payload) under `success`. */
export const makeCompleteJobParameters = (output: JsonSchema.JsonSchema) =>
  Schema.Struct({
    // Both fields accept `null` because models emit it for a field they mean to omit.
    success: Schema.optional(
      Schema.NullOr(isUndeclaredOutput(output) ? JsonPayload : JsonSchema.toEffectSchema(output)),
    ),
    failure: Schema.optional(
      Schema.NullOr(
        Schema.Struct({
          message: Schema.String.annotate({
            description: 'Short message describing the error.',
          }),
          description: Schema.optional(Schema.NullOr(Schema.String)).annotate({
            description: 'Optional longer message describing in detail what went wrong',
          }),
        }),
      ),
    ),
  });

/**
 * The tool a routine signals completion with: its declared output under `success`, or a failure.
 *
 * Dynamic rather than static: a dynamic tool's JSON schema reaches the provider verbatim, while a
 * static tool is serialized through the provider's structured-output transformer, which rewrites
 * object members into typeless subschemas the Anthropic API rejects. The caller decodes the
 * (unvalidated) input against {@link makeCompleteJobParameters}, so what the model is told and
 * what is validated agree.
 */
export const makeCompleteJobTool = (output: JsonSchema.JsonSchema) =>
  Tool.dynamic('completeJob', {
    parameters: JsonSchema.toJsonSchema(makeCompleteJobParameters(output)),
    failure: Schema.String,
  }).annotate(Tool.Strict, false);
