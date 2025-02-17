//
// Copyright 2024 DXOS.org
//

import { ComputeGraph } from '@dxos/conductor';
import { Expando, Ref, S, TypedObject, type Ref$ } from '@dxos/echo-schema';
import { FunctionType } from '@dxos/functions';

// TODO(burdon): Change to S.Literal (and discriminated union).
export enum ChainInputType {
  VALUE = 0,
  PASS_THROUGH = 1,
  RETRIEVER = 2,
  FUNCTION = 3,
  QUERY = 4,
  RESOLVER = 5,
  CONTEXT = 6,
  SCHEMA = 7,
}

export const ChainInputSchema = S.mutable(
  S.Struct({
    name: S.String,
    type: S.optional(S.Enums(ChainInputType)),
    value: S.optional(S.String),
  }),
);

export type ChainInput = S.Schema.Type<typeof ChainInputSchema>;

export class ChainPromptType extends TypedObject({ typename: 'dxos.org/type/ChainPrompt', version: '0.1.0' })({
  command: S.optional(S.String),
  template: S.String,
  inputs: S.optional(S.mutable(S.Array(ChainInputSchema))),
}) {}

export class ChainType extends TypedObject({ typename: 'dxos.org/type/Chain', version: '0.1.0' })({
  name: S.optional(S.String),
  prompts: S.optional(S.mutable(S.Array(Ref(ChainPromptType)))),
}) {}

export class AIChatType extends TypedObject({ typename: 'dxos.org/type/AIChat', version: '0.1.0' })({
  name: S.optional(S.String),
  // TODO(wittjosiah): Should be a ref to a Queue.
  queue: Ref(Expando),
}) {}

const ApiAuthorizationKey = S.Struct({
  type: S.Literal('api-key'),
  key: S.String,
  placement: S.Union(
    S.Struct({
      type: S.Literal('authorization-header'),
    }),
    S.Struct({
      type: S.Literal('query'),
      name: S.String,
    }),
  ),
});

const ApiAuthorizationOauth = S.Struct({
  type: S.Literal('oauth'),
  clientId: S.String,
  clientSecret: S.String,
  tokenUrl: S.String,
  grantType: S.String,
});

export const ApiAuthorization = S.Union(ApiAuthorizationKey, ApiAuthorizationOauth);
export type ApiAuthorization = S.Schema.Type<typeof ApiAuthorization>;

const ServiceInterfaceFunction = S.Struct({
  kind: S.Literal('function'),
  fn: Ref(FunctionType) as Ref$<FunctionType>,
});

const ServiceInterfaceWorkflow = S.Struct({
  kind: S.Literal('workflow'),
  workflow: Ref(ComputeGraph) as Ref$<ComputeGraph>,
});

const ServiceInterfaceApi = S.Struct({
  kind: S.Literal('api'),

  /**
   * URL to fetch the openapi schema.
   */
  schemaUrl: S.optional(S.String),

  /**
   * Inlined openapi schema.
   */
  schema: S.optional(S.Any),

  /**
   * Authorization configuration if required.
   */
  authorization: S.optional(ApiAuthorization),
});

const ServiceInterface = S.Union(ServiceInterfaceFunction, ServiceInterfaceWorkflow, ServiceInterfaceApi);
export type ServiceInterface = S.Schema.Type<typeof ServiceInterface>;

export class ServiceType extends TypedObject({ typename: 'dxos.org/type/Service', version: '0.1.0' })({
  name: S.optional(S.String),
  description: S.optional(S.String),

  /**
   * Entries exposed: functions, workflows, and APIs.
   */
  interfaces: S.optional(S.Array(ServiceInterface)),
}) {}
