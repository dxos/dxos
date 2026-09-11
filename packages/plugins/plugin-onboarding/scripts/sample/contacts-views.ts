//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Filter, JsonSchema, Query, View } from '@dxos/echo';
import * as Kanban from '@dxos/plugin-kanban/Kanban';
import * as MapView from '@dxos/plugin-map/Map';
import { Table } from '@dxos/react-ui-table/types';
import { ViewModel } from '@dxos/schema';
import { Organization } from '@dxos/types';

//
// Organization views (Table / Kanban / Map)
//

/**
 * Table, Kanban and Map over the organizations. Each view object holds its own `View.View` so they
 * can be customised independently (e.g. Kanban's pivot field); the query and jsonSchema are shared.
 * Views live directly in the space DB and surface via the database viewer, so they need no
 * collection of their own.
 */
export const ContactsViews: SampleSpace.Phase<void> = SampleSpace.phase('contactsViews', {
  schemas: [View.View, Table.Table, Kanban.Kanban, MapView.Map],
  run: () =>
    Effect.gen(function* () {
      const jsonSchema = JsonSchema.toJsonSchema(Organization.Organization);
      const query = Query.select(Filter.type(Organization.Organization));
      const makeView = (fields: string[], pivotFieldName?: string) =>
        Database.add(ViewModel.make({ query, queryRaw: undefined, jsonSchema, fields, pivotFieldName }));

      const tableView = yield* makeView(['name', 'status', 'website', 'description']);
      yield* Database.add(Table.make({ name: 'Table', view: tableView, jsonSchema }));

      const kanbanView = yield* makeView(['name', 'status', 'description'], 'status');
      yield* Database.add(Kanban.make({ name: 'Kanban', view: kanbanView }));

      const mapView = yield* makeView(['name', 'location', 'description']);
      yield* Database.add(MapView.make({ name: 'Map', view: mapView, center: [-100, 30], zoom: 2 }));
    }),
});
