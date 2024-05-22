//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

export const ObjectMetaSchema = S.struct({
  keys: S.mutable(
    S.array(
      S.partial(
        S.struct({
          source: S.string,
          id: S.string,
        }),
      ),
    ),
  ),
});

export type ObjectMetaType = S.Schema.Type<typeof ObjectMetaSchema>;
