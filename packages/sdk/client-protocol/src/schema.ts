//
// Copyright 2024 DXOS.org
//

import { EchoObject, S } from '@dxos/echo-schema';

// export class PropertiesType extends TypedObject({ typename: 'dxos.sdk.client.Properties', version: '0.1.0' })({
//   name: S.optional(S.String),
// }) {}

// TODO(burdon): Replace with TypedObject.
export const PropertiesType = S.Struct(
  {
    name: S.optional(S.String),
  },
  {
    key: S.String,
    value: S.Any,
  },
).pipe(EchoObject('dxos.sdk.client.Properties', '0.1.0'));

export interface PropertiesType extends S.Schema.Type<typeof PropertiesType> {}

// TODO(burdon): Rename?
export type PropertiesTypeProps = Pick<PropertiesType, 'name'>;
