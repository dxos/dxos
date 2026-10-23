//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, JsonSchema, Query, type Type } from '@dxos/echo';
import { Table } from '@dxos/react-ui-table/types';
import { ViewModel } from '@dxos/schema';
import { Organization, Person } from '@dxos/types';

export type Views = {
  readonly personTable: Table.Table;
  readonly organizationTable: Table.Table;
};

const makeView = (schema: Type.AnyEntity, fields: string[]) => {
  const jsonSchema = JsonSchema.toJsonSchema(schema);
  const query = Query.select(Filter.type(schema));
  return Effect.map(Database.add(ViewModel.make({ query, queryRaw: undefined, jsonSchema, fields })), (view) => ({
    view,
    jsonSchema,
  }));
};

/**
 * Tables over people and organizations, kept in the database rather than a collection: the CRM
 * section (plugin-crm) is where people and organizations are browsed.
 */
export const makeViews = Effect.fnUntraced(function* () {
  const personFields = yield* makeView(Person.Person, ['fullName', 'jobTitle', 'organization', 'emails']);
  const personTable = yield* Database.add(Table.make({ name: 'Contacts', ...personFields }));

  const organizationFields = yield* makeView(Organization.Organization, ['name', 'status', 'website', 'description']);
  const organizationTable = yield* Database.add(Table.make({ name: 'Organizations', ...organizationFields }));

  return { personTable, organizationTable } satisfies Views;
});
