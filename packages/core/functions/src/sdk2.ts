import * as Schema from 'effect/Schema';
import type * as Type from '@dxos/echo';
import * as Effect from 'effect/Effect';
import type * as Context from 'effect/Context';

import { AccessToken } from '@dxos/types';
import { CredentialsService } from './services';

export interface Definition<I, O, S> {
  key: string;
  name: string;
  description?: string;
  input: Schema.Schema<I>;
  outputSchema: Schema.Schema<O>;
  types: readonly Type.Entity.Any[];
  services: readonly Context.Tag<S, any>[];

  implement: (handler: Handler<I, O, S>) => Implementation<I, O, S>;
}

export declare namespace Definition {
  export type Any = Definition<any, any, any>;
  export type Input<T extends Any> = T extends Definition<infer I, any, any> ? I : never;
  export type Output<T extends Any> = T extends Definition<any, infer O, any> ? O : never;
  export type Services<T extends Any> = T extends Definition<any, any, infer S> ? S : never;
}

/**
 * Function handler.
 */
export type Handler<I, O, S> = (params: {
  /**
   * Context available to the function.
   */
  data: I;
}) => O | Promise<O> | Effect.Effect<O, any, S>;

export interface Implementation<I, O, S> extends Definition<I, O, S> {
  handler: Handler<I, O, S>;
}

type MakeParamsBase = Pick<Definition.Any, 'key' | 'name' | 'description'> & {
  input: Schema.Struct.Fields;
  output?: Schema.Struct.Fields;
  types?: readonly Type.Entity.Any[];
  services?: readonly Context.Tag<any, any>[];
};

type StructType<F> = F extends Schema.Struct.Fields ? Schema.Schema.Type<Schema.Struct<F>> : never;

type InputTypeFromParams<Params extends MakeParamsBase> = Params extends { input: infer F } ? StructType<F> : void;
type OutputTypeFromParams<Params extends MakeParamsBase> = Params extends { output: infer F } ? StructType<F> : void;
type ServicesFromParams<Params extends MakeParamsBase> = Params extends {
  services: readonly Context.Tag<infer S, any>[];
}
  ? S
  : never;

export const make: {
  <Params extends MakeParamsBase>(
    params: Params,
  ): Implementation<InputTypeFromParams<Params>, OutputTypeFromParams<Params>, ServicesFromParams<Params>>;
} = (params) => {
  const definition: Definition.Any = {
    ...params,
  } as any;
  definition.implement = (handler) => {
    return {
      ...definition,
      handler,
    };
  };
  return definition as any;
};

///

const CreateAccessToken = make({
  key: 'create-access-token',
  name: 'Create Access Token',
  description: 'Create a new access token',
  input: {
    source: Schema.String,
    token: Schema.String,
  },
  services: [CredentialsService],
});

const CreateAccessTokenImplementation = CreateAccessToken.implement(({ data }) =>
  Effect.gen(function* () {
    const credentials = yield* CredentialsService;
  }),
);
