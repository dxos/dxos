import type { Schema } from 'effect';

export interface ComputeNode<I, O> {
  input: Schema.Schema<I>;
  output: Schema.Schema<O>;
}

export namespace ComputeNode {
  export type Input<N extends Any> = N extends ComputeNode<infer I, infer O> ? I : never;
  export type Output<N extends Any> = N extends ComputeNode<infer I, infer O> ? O : never;
  export type Any = ComputeNode<any, any>;
}

export interface ComputeGraph<I, O> extends ComputeNode<I, O> {}

export interface NodeBuilder<N extends ComputeNode.Any> {
  in: { [Key in keyof ComputeNode.Input<N>]: NodeInputBuilder<ComputeNode.Input<N>[Key]> };
  out: { [Key in keyof ComputeNode.Output<N>]: NodeOutputBuilder<ComputeNode.Output<N>[Key]> };
}

export interface NodeInputBuilder<T> {
  InputType: T;
}

export interface NodeOutputBuilder<T> {
  OutputType: T;
}

export class ComputeGraphBuilder<I, O> {
  static build<InputFields extends Schema.Struct.Fields, OutputFields extends Schema.Struct.Fields>(
    opts: {
      input: InputFields;
      output: OutputFields;
    },
    cb: (
      builder: ComputeGraphBuilder<
        Schema.Schema.Type<Schema.Struct<InputFields>>,
        Schema.Schema.Type<Schema.Struct<OutputFields>>
      >,
    ) => Partial<{
      [Key in keyof Schema.Schema.Type<Schema.Struct<OutputFields>>]: NodeOutputBuilder<
        Schema.Schema.Type<Schema.Struct<OutputFields>>[Key]
      >;
    }> | void,
  ): ComputeGraph<Schema.Schema.Type<Schema.Struct<InputFields>>, Schema.Schema.Type<Schema.Struct<OutputFields>>> {
    throw new Error('Not implemented');
  }

  readonly in!: { [Key in keyof I]: NodeOutputBuilder<I[Key]> };
  readonly out!: { [Key in keyof O]: NodeInputBuilder<O[Key]> };

  node<N extends ComputeNode.Any>(
    node: N,
    inputs?: Partial<{ [Key in keyof ComputeNode.Input<N>]: NodeOutputBuilder<ComputeNode.Input<N>[Key]> }>,
  ): NodeBuilder<N> {
    throw new Error('Not implemented');
  }

  connect<T>(output: NodeOutputBuilder<T>, input: NodeInputBuilder<T>) {
    throw new Error('Not implemented');
  }

  const<T>(value: T): NodeOutputBuilder<T> {
    throw new Error('Not implemented');
  }
}
