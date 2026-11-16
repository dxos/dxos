//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type TypeDescription, describeTypes, renderFields } from '@dxos/assistant/Describe';
import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { ranked } from './catalog.ts';
import { QueryTypes } from './definitions.ts';

const listedType = ({ typename, dxn, kind }: TypeDescription) => ({ typename, dxn, kind });

export default QueryTypes.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ query, typenames } = {}) {
      const { db } = yield* Database.Service;
      if (typenames !== undefined) {
        // A lookup spells out every variant of a union, since this is how a model finds the fields it must write.
        return describeTypes(db, { abridge: false })
          .filter(({ typename, dxn }) => typenames.includes(typename) || typenames.includes(dxn))
          .map((type) => ({ ...listedType(type), fields: renderFields(type.fields) }));
      }
      return ranked(describeTypes(db), query, ({ typename, fields }) => [
        typename,
        ...fields.map(({ name }) => name),
      ]).map(listedType);
    }),
  ),
);
