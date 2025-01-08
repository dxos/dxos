import { S } from '@dxos/echo-schema';
import { Effect } from 'effect';

export const ComputeNode = S.Struct({
  /**
   * DXN of the node specifier.
   */
  type: S.String,
});
export type ComputeNode = S.Schema.Type<typeof ComputeNode>;

export const ComputeEdge = S.Struct({
  /**
   * Input anchor name.
   */
  input: S.String,

  /**
   * Output anchor name.
   */
  output: S.String,
});
export type ComputeEdge = S.Schema.Type<typeof ComputeEdge>;

export type ComputeCallback<I, O> = (input: I) => Effect.Effect<O, Error>;

export type ComputeImplementation<
  SI extends S.Schema.AnyNoContext = S.Schema.AnyNoContext,
  SO extends S.Schema.AnyNoContext = S.Schema.AnyNoContext,
> = {
  input: SI;
  output: SO;
  /**
   * Missing for meta nodes like input/output.
   */
  compute?: ComputeCallback<S.Schema.Type<SI>, S.Schema.Type<SO>>;
};

export const defineComputeNode = <SI extends S.Schema.AnyNoContext, SO extends S.Schema.AnyNoContext>(opts: {
  input: SI;
  output: SO;
  compute?: ComputeCallback<S.Schema.Type<SI>, S.Schema.Type<SO>>;
}): ComputeImplementation => {
  return { input: opts.input, output: opts.output, compute: opts.compute };
};

/**
 * Well-known node types.
 */
export const NodeType = Object.freeze({
  Input: 'dxn:graph:input',
  Output: 'dxn:graph:output',
});
