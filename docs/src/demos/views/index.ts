//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Filter, JsonSchema, Query, View } from '@dxos/echo';
import * as Kanban from '@dxos/plugin-kanban/Kanban';
import { UNCATEGORIZED_VALUE } from '@dxos/plugin-kanban/KanbanConstants';
import * as KanbanPlugin from '@dxos/plugin-kanban/KanbanPlugin';
import * as TablePlugin from '@dxos/plugin-table/TablePlugin';
import { Table } from '@dxos/react-ui-table/types';
import { ViewModel } from '@dxos/schema';
import { Organization } from '@dxos/types';

import { companySchemas, seedCompanies } from '../companies.ts';
import * as Demo from '../Demo.ts';

const partial = SampleSpace.partial('echo-demo-views', {
  schemas: [...companySchemas, View.View, Table.Table, Kanban.Kanban],
  run: () =>
    Effect.gen(function* () {
      yield* seedCompanies();
      const jsonSchema = JsonSchema.toJsonSchema(Organization.Organization);
      const query = Query.select(Filter.type(Organization.Organization));
      const makeView = (fields: string[], pivotFieldName?: string) =>
        Database.add(ViewModel.make({ query, queryRaw: undefined, jsonSchema, fields, pivotFieldName }));

      const table = yield* Database.add(
        Table.make({ name: 'Pipeline', view: yield* makeView(['name', 'status', 'website']), jsonSchema }),
      );
      const board = yield* Database.add(
        Kanban.make({
          name: 'Pipeline',
          view: yield* makeView(['name', 'status'], 'status'),
          // Every company has a status, so the column for those without one would only take room.
          arrangement: { order: [], columns: { [UNCATEGORIZED_VALUE]: { ids: [], hidden: true } } },
        }),
      );
      return { table, board };
    }),
});

/** One set of companies as a table on one peer and a board on the other: move a card and its row changes. */
export const ViewsDemo = Demo.make({
  id: 'views',
  title: 'Table and board',
  partial,
  plugins: () => [TablePlugin.make(), KanbanPlugin.make()],
  views: { table: 'Table', board: 'Board' },
  layout: ['table', 'board'],
});
