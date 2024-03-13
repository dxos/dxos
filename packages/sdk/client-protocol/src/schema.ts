//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';

export const PropertiesSchema = S.struct({
  name: S.optional(S.string),
  // TODO(dmaretskyi): Remove.
  'composer.dxos.org.opened': S.optional(S.number),
  'composer.dxos.org.version': S.optional(S.union(S.string, S.number)),
  'braneframe.Folder': S.optional(E.ref(E.AnyEchoObject)),
}).pipe(E.echoObject('dxos.sdk.client.Properties', '0.1.0'));
