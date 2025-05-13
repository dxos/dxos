//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';

import { EchoObject, ObjectId, Ref } from '@dxos/echo-schema';
import { OAuthProvider } from '@dxos/protocols';
import { DataType } from '@dxos/schema';

/**
 * Configured integrations stored in a space.
 */
export const IntegrationType = S.Struct({
  id: ObjectId,
  accessToken: S.optional(Ref(DataType.AccessToken)),
  serviceId: S.String,
  config: S.optional(S.Record({ key: S.String, value: S.String })),
}).pipe(EchoObject({ typename: 'dxos.org/type/Integration', version: '0.1.0' }));
export type IntegrationType = S.Schema.Type<typeof IntegrationType>;

const OAuthSpec = S.Struct({
  kind: S.Literal('oauth'),
  note: S.String,
  source: S.String,
  provider: S.Enums(OAuthProvider),
  scopes: S.Array(S.String),
});

const TokenSpec = S.Struct({
  kind: S.Literal('token'),
  note: S.String,
  source: S.String,
});

const IntegrationAuth = S.Union(OAuthSpec, TokenSpec);

/**
 * Definition of available integrations to setup in a space.
 */
export const IntegrationDefinition = S.Struct({
  serviceId: S.String,
  name: S.optional(S.String),
  description: S.optional(S.String),
  icon: S.optional(S.String),
  auth: S.optional(IntegrationAuth),
}).pipe(EchoObject({ typename: 'dxos.org/type/IntegrationDefinition', version: '0.1.0' }));
export type IntegrationDefinition = S.Schema.Type<typeof IntegrationDefinition>;

export type IntegrationQuery = {
  name?: string;
  category?: string;
};

export interface BaseIntegrationRegistry {
  queryIntegrations(query?: IntegrationQuery): Promise<IntegrationDefinition[]>;
}
