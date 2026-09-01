// Copyright 2026 DXOS.org

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Query } from '@dxos/echo';
import { findDuplicates } from '@dxos/extractor';

import { SpaceOperation } from '#types';

import { resolveIdentitySpec } from './helpers.ts';

const handler: Operation.WithHandler<typeof SpaceOperation.FindDuplicates> = SpaceOperation.FindDuplicates.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ typename }) {
      const spec = yield* resolveIdentitySpec(typename);
      if (!spec) {
        return { groups: [] };
      }

      // Query through the spec's own type entity rather than the bare typename, so the filter uses
      // the same type identity the spec was registered under.
      const objects = yield* Database.query(Query.select(Filter.type(spec.type))).run;
      return {
        groups: findDuplicates(spec, objects).map((group) => ({
          keys: group.keys,
          objectIds: group.objects.map((object) => object.id),
        })),
      };
    }),
  ),
);

export default handler;
