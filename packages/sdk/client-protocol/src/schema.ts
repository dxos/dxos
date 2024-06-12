//
// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';

export class PropertiesType extends TypedObject({ typename: 'dxos.sdk.client.Properties', version: '0.1.0' })({
  name: S.optional(S.String),
}) {}

// TODO(burdon): Rename.
export type PropertiesTypeProps = Pick<PropertiesType, 'name'>;
