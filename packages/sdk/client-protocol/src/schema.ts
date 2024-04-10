//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';

const _Properties = S.struct({ name: S.optional(S.string) }, { key: S.string, value: S.any }).pipe(
  E.echoObject('dxos.sdk.client.Properties', '0.1.0'),
);
export interface Properties extends S.Schema.Type<typeof _Properties> {}
export const Properties = _Properties;

export type PropertiesProps = {
  name?: string;
};
