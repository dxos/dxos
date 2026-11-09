//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type TypeDescription, describeTypes, renderFields } from '@dxos/assistant/Describe';
import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { ranked } from './catalog.ts';
import { QueryTypes } from './definitions.ts';

const typeRow = ({ typename, dxn, kind }: TypeDescription) => ({ typename, dxn, kind });

export default QueryTypes.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ query, typenames } = {}) {
      const { db } = yield* Database.Service;
      const types = describeTypes(db);
      if (typenames !== undefined) {
        return types
          .filter(({ typename, dxn }) => typenames.includes(typename) || typenames.includes(dxn))
          .map((type) => ({ ...typeRow(type), fields: renderFields(type.fields) }));
      }
      return ranked(types, query, ({ typename, fields }) => [typename, ...fields.map(({ name }) => name)]).map(typeRow);
    }),
  ),
);
