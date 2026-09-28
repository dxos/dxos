//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Filter, JsonSchema, Query, Ref, View } from '@dxos/echo';
import { ViewModel } from '@dxos/schema';
import { Organization, Pipeline } from '@dxos/types';

import { type AccountMap } from './accounts.ts';

//
// The pipeline board.
//
// A `Pipeline` column is a `View` plus an explicit `order` of object ids, so each stage is a query
// (`status = 'qualified'`) rather than a hand-maintained membership list — an account moves stage by
// having its `status` changed, which is what the board's drag does at runtime.
//

const STAGES = [
  { name: 'Prospect', status: 'prospect' },
  { name: 'Qualified', status: 'qualified' },
  { name: 'Commit', status: 'commit' },
  { name: 'Closed won', status: 'active' },
  { name: 'Closed lost', status: 'reject' },
] as const;

const FIELDS = ['name', 'status', 'website', 'description'];

export type PipelineResult = { pipeline: Pipeline.Pipeline };

/** The board, plus a Table over every account for the flat view of the same data. */
export const PipelineBoard: SampleSpace.Phase<PipelineResult, AccountMap> = SampleSpace.phase('pipeline', {
  schemas: [Pipeline.Pipeline, View.View],
  run: (accounts: AccountMap) =>
    Effect.gen(function* () {
      const jsonSchema = JsonSchema.toJsonSchema(Organization.Organization);

      const columns = yield* Effect.forEach(STAGES, (stage) =>
        Effect.gen(function* () {
          const view = yield* Database.add(
            ViewModel.make({
              query: Query.select(Filter.type(Organization.Organization, { status: stage.status })),
              queryRaw: undefined,
              jsonSchema,
              fields: FIELDS,
            }),
          );
          // The column's order is explicit so a board that has been rearranged keeps its order; the
          // seeds are listed in the order the stage should read.
          const order = Object.values(accounts)
            .filter((account) => account.status === stage.status)
            .map((account) => account.id);
          return { name: stage.name, order, view: Ref.make(view) };
        }),
      );

      const pipeline = yield* Database.add(
        Pipeline.make({
          name: 'Sales pipeline',
          description: 'Every account, by stage. Moving a card changes the account status.',
          columns,
        }),
      );

      return { pipeline };
    }),
});
