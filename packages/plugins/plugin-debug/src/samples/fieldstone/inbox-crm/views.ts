//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, JsonSchema, Query, Ref, type Type } from '@dxos/echo';
import * as Kanban from '@dxos/plugin-kanban/Kanban';
import { Table } from '@dxos/react-ui-table/types';
import { ViewModel } from '@dxos/schema';
import { Organization, Person } from '@dxos/types';

/** Person Kanban columns, in board order. */
export const DEPARTMENTS = [
  'Leadership',
  'Engineering',
  'Product',
  'Design',
  'Developer Relations',
  'Sales',
  'Partnerships',
  'Security',
] as const;

export type Views = {
  readonly personTable: Table.Table;
  readonly personKanban: Kanban.Kanban;
  readonly organizationTable: Table.Table;
  readonly organizationKanban: Kanban.Kanban;
};

const makeView = (schema: Type.AnyEntity, fields: string[], pivotFieldName?: string) => {
  const jsonSchema = JsonSchema.toJsonSchema(schema);
  const query = Query.select(Filter.type(schema));
  return Effect.map(
    Database.add(ViewModel.make({ query, queryRaw: undefined, jsonSchema, fields, pivotFieldName })),
    (view) => ({ view, jsonSchema }),
  );
};

/**
 * Tables and Kanbans over people and organizations, kept in the database rather than a collection:
 * the CRM section (plugin-crm) is where people and organizations are browsed. The Person Kanban is
 * an items board pivoting on `department`: a view Kanban pivots only on a single-select field.
 */
export const makeViews = (people: ReadonlyArray<Person.Person>) =>
  Effect.gen(function* () {
    const personFields = yield* makeView(Person.Person, ['fullName', 'jobTitle', 'organization', 'emails']);
    const personTable = yield* Database.add(Table.make({ name: 'Contacts', ...personFields }));

    const onBoard = people.filter((person) => person.department !== undefined);
    const personKanban = yield* Database.add(
      Kanban.makeItems({
        name: 'Contacts by department',
        pivotField: 'department',
        items: onBoard.map((person) => Ref.make(person)),
        arrangement: {
          order: [...DEPARTMENTS],
          columns: Object.fromEntries(
            DEPARTMENTS.map((department) => [
              department,
              { ids: onBoard.filter((person) => person.department === department).map((person) => person.id) },
            ]),
          ),
        },
      }),
    );

    const organizationFields = yield* makeView(Organization.Organization, ['name', 'status', 'website', 'description']);
    const organizationTable = yield* Database.add(Table.make({ name: 'Organizations', ...organizationFields }));
    const { view: statusView } = yield* makeView(
      Organization.Organization,
      ['name', 'status', 'description'],
      'status',
    );
    const organizationKanban = yield* Database.add(Kanban.make({ name: 'Organizations by status', view: statusView }));

    return { personTable, personKanban, organizationTable, organizationKanban } satisfies Views;
  });
