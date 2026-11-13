//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Filter, JsonSchema, Query, View } from '@dxos/echo';
import * as Kanban from '@dxos/plugin-kanban/Kanban';
import { UNCATEGORIZED_VALUE } from '@dxos/plugin-kanban/KanbanConstants';
import * as KanbanPlugin from '@dxos/plugin-kanban/KanbanPlugin';
import * as TablePlugin from '@dxos/plugin-table/TablePlugin';
import { Table } from '@dxos/react-ui-table/types';
import { ViewModel } from '@dxos/schema';
import * as Cell from '@dxos/storybook-testing/Cell';
import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';
import { Organization } from '@dxos/types';

import { companies, companySchemas } from '../content/companies.ts';
import { decorators } from '../testing.ts';

const views = SampleSpace.partial('echo-demo-views', {
  schemas: [...companySchemas, View.View, Table.Table, Kanban.Kanban],
  run: () =>
    Effect.gen(function* () {
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

const meta: Meta<typeof ModuleContainer.Root> = {
  title: 'stories/stories-echo/Views',
  render: ModuleContainer.Root,
  args: { compact: true },
  parameters: { layout: 'fullscreen' },
  tags: ['docs-embed'],
};

export default meta;

/** One set of companies as a table on one peer and a board on the other: move a card and its row changes. */
export const Views: StoryObj = {
  decorators: decorators({
    title: 'Table and board',
    plugins: [TablePlugin.make(), KanbanPlugin.make()],
    onInit: async ({ run }) => {
      await run(companies);
      const { table, board } = await run(views);
      return {
        views: {
          table: { label: 'Table', layout: [[Cell.article(table)]] },
          board: { label: 'Board', layout: [[Cell.article(board)]] },
        },
        open: ['table', 'board'],
      };
    },
  }),
};
