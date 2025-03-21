//
// Copyright 2024 DXOS.org
//

import { ComputeGraph } from '@dxos/conductor';
import { Ref, S, TypedObject, type Ref$ } from '@dxos/echo-schema';
import { FunctionType } from '@dxos/functions/types';

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

export class ServiceType extends TypedObject({ typename: 'dxos.org/type/ServiceType', version: '0.1.0' })({
  serviceId: S.String,
  name: S.optional(S.String),
  description: S.optional(S.String),
  category: S.optional(S.String),
  enabled: S.optional(S.Boolean),

  /**
   * Entries exposed: functions, workflows, and APIs.
   */
  interfaces: S.optional(S.Array(ServiceInterface)),
}) {}

//
// Service Registry
//

export type ServiceQuery = {
  name?: string;
  category?: string;
};

export interface BaseServiceRegistry {
  queryServices(query?: ServiceQuery): Promise<ServiceType[]>;
}

export const categoryIcons: Record<string, string> = {
  finance: 'ph--bank--regular',
  health: 'ph--heart--regular',
  geolocation: 'ph--globe-simple--regular',
  education: 'ph--books--regular',
  entertainment: 'ph--music-notes--regular',
  shopping: 'ph--shopping-cart--regular',
  travel: 'ph--airplane-takeoff--regular',
  utilities: 'ph--lightning--regular',
  weather: 'ph--cloud-rain--regular',
} as const;
