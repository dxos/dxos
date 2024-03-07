import * as S from '@effect/schema/Schema';
import * as E from '@dxos/echo-schema';

export const PropertiesSchema = S.struct({
  name: S.optional(S.string),
}).pipe(E.echoObject('dxos.sdk.client.Properties', '0.1.0'));
