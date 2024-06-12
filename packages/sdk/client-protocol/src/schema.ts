//
// Copyright 2024 DXOS.org
//

import { EchoObject, S } from '@dxos/echo-schema';

// TODO(burdon): Is this only used for Space properties?
export const PropertiesSchema = S.Struct(
  {
    name: S.optional(S.String),
  },
  // TODO(burdon): Expando schema?
  {
    key: S.String,
    value: S.Any,
  },
).pipe(EchoObject('dxos.sdk.client.Properties', '0.1.0'));

export interface Properties extends S.Schema.Type<typeof PropertiesSchema> {}

// TODO(burdon): Rename?
export type PropertiesProps = Pick<Properties, 'name'>;
