//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Tool from 'effect/unstable/ai/Tool';

import { JsonSchema } from '@dxos/echo';

/** `Instructions.make` defaults `output` to `Schema.Void`; this is what that serializes to. */
const UNDECLARED_OUTPUT = JsonSchema.toJsonSchema(Schema.Void);

const isUndeclaredOutput = (output: JsonSchema.JsonSchema): boolean =>
  ('$id' in output && output.$id === '/schemas/unknown') ||
  ('type' in output && output.type === (UNDECLARED_OUTPUT as { type?: unknown }).type);

export const makeCompleteJobTool = (output: JsonSchema.JsonSchema) => {
  // A routine that declares no output still has to let `completeJob` carry an arbitrary success
  // payload — decoding against the default would reject one with `Expected null | undefined`.
  const undeclared = isUndeclaredOutput(output);
  const tool = Tool.make('completeJob', {
    // Both fields accept `null` because models emit it for a field they mean to omit.
    parameters: Schema.Struct({
      success: Schema.optional(Schema.NullOr(undeclared ? Schema.Any : JsonSchema.toEffectSchema(output))),
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
    }),
  });

  // `Schema.Any` serializes to the empty schema, which Anthropic's strict tool validation rejects
  // while admitting no free-form object in its place.
  return tool.annotate(Tool.Strict, !undeclared);
};
