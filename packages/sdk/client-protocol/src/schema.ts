//
// Copyright 2024 DXOS.org
//

import { echoObject, S } from '@dxos/echo-schema';

const _Properties = S.Struct({ name: S.optional(S.String) }, { key: S.String, value: S.Any }).pipe(
  echoObject('dxos.sdk.client.Properties', '0.1.0'),
);
export interface Properties extends S.Schema.Type<typeof _Properties> {}
export const Properties = _Properties;

export type PropertiesProps = {
  name?: string;
};
