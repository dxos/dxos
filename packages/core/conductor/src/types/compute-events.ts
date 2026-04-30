//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { Trace } from '@dxos/functions';

/**
 * Compute graph node started executing.
 */
export const ComputeBeginEvent = Trace.EventType('compute.begin', {
  schema: Schema.Struct({
    nodeId: Schema.String,
    inputs: Schema.Array(Schema.String),
  }),
  isEphemeral: true,
});

/**
 * Compute graph node finished executing.
 */
export const ComputeEndEvent = Trace.EventType('compute.end', {
  schema: Schema.Struct({
    nodeId: Schema.String,
    outputs: Schema.Array(Schema.String),
  }),
  isEphemeral: true,
});

/**
 * Compute graph node input was resolved.
 */
export const ComputeInputEvent = Trace.EventType('compute.input', {
  schema: Schema.Struct({
    nodeId: Schema.String,
    property: Schema.String,
    value: Schema.Unknown,
  }),
  isEphemeral: true,
});

/**
 * Compute graph node output was resolved.
 */
export const ComputeOutputEvent = Trace.EventType('compute.output', {
  schema: Schema.Struct({
    nodeId: Schema.String,
    property: Schema.String,
    value: Schema.Unknown,
  }),
  isEphemeral: true,
});

/**
 * Custom event emitted from within a node compute function.
 */
export const ComputeCustomEvent = Trace.EventType('compute.custom', {
  schema: Schema.Struct({
    nodeId: Schema.String,
    event: Schema.Unknown,
  }),
  isEphemeral: true,
});

/**
 * Carries the current compute node context (e.g., the executing node id).
 * Provided by the compute graph executor when invoking a node's compute function.
 */
export class ComputeNodeContext extends Context.Tag('@dxos/conductor/ComputeNodeContext')<
  ComputeNodeContext,
  { readonly nodeId: string }
>() {
  static layerNoop: Layer.Layer<ComputeNodeContext> = Layer.succeed(ComputeNodeContext, { nodeId: '' });
}

/**
 * Records a custom event on the trace tagged with the current compute node id.
 * Must be called from within a node compute function so that {@link ComputeNodeContext} is available.
 */
export const logCustomEvent = (
  data: unknown,
): Effect.Effect<void, never, Trace.TraceService | ComputeNodeContext> =>
  Effect.gen(function* () {
    const { nodeId } = yield* ComputeNodeContext;
    yield* Trace.write(ComputeCustomEvent, { nodeId, event: data });
  });
