//
// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';

export class PropertiesType extends TypedObject({ typename: 'dxos.sdk.client.Properties', version: '0.1.0' })({
  name: S.optional(S.String),
}) {}

// TODO(burdon): Is this only used for Space properties?
// export const PropertiesSchema = S.Struct(
//   {
//     name: S.optional(S.String),
//   },
//   // TODO(burdon): Expando schema?
//   {
//     key: S.String,
//     value: S.Any,
//   },
// ).pipe(EchoObject('dxos.sdk.client.Properties', '0.1.0'));

// export interface Properties extends S.Schema.Type<typeof PropertiesSchema> {}

// TODO(burdon): Rename?
// export type PropertiesProps = Pick<Properties, 'name'>;
