//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Annotation, Database, DXN, Obj, Ref, Type, View } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';
import { Format, FormatAnnotation } from '@dxos/echo/Format';
import { PropertyMetaAnnotationId } from '@dxos/echo/internal';
import * as Kanban from '@dxos/plugin-kanban/Kanban';
import { Table } from '@dxos/react-ui-table/types';
import { ViewModel } from '@dxos/schema';
import { Person } from '@dxos/types';

import { type PersonKey, type PersonMap } from './people.ts';
import { daysAgo, daysFromNow } from './util.ts';

//
// RoastLog — exemplar-specific schema defined entirely in this build script.
//
// This is intentionally NOT a registered plugin type — it demonstrates that
// users can define custom ECHO schemas for their own domain objects. The typename
// uses a Bramble-specific namespace to show schemas don't need to live in @dxos.
//
// The jsonSchema is baked into each View.View so Table/Kanban can render these
// objects at runtime without the schema being registered in the app.
//
const RoastLog = Type.makeObject(DXN.make('example.type.roastLog', '0.1.0'))(
  Schema.Struct({
    title: Schema.String.pipe(Schema.annotate({ title: 'Batch' })),
    date: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Date' }))),
    origin: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Origin / Lot' }))),
    machine: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Machine' }))),
    roaster: Schema.optional(Ref.Ref(Person.Person).annotate({ title: 'Roaster' })),
    greenWeightKg: Schema.optional(Schema.Number.pipe(Schema.annotate({ title: 'Green (kg)' }))),
    roastWeightKg: Schema.optional(Schema.Number.pipe(Schema.annotate({ title: 'Roast (kg)' }))),
    chargeTemp: Schema.optional(Schema.Number.pipe(Schema.annotate({ title: 'Charge (°C)' }))),
    firstCrackTime: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'First Crack' }))),
    developmentTime: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Dev Time' }))),
    dropTemp: Schema.optional(Schema.Number.pipe(Schema.annotate({ title: 'Drop (°C)' }))),
    roastLevel: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Roast Level' }))),
    status: Schema.Literals(['planned', 'roasted', 'cupped', 'approved']).pipe(
      FormatAnnotation.set(Format.TypeFormat.SingleSelect),
      Schema.annotate({
        title: 'Status',
        [PropertyMetaAnnotationId]: {
          singleSelect: {
            options: [
              { id: 'planned', title: 'Planned', color: 'indigo' },
              { id: 'roasted', title: 'Roasted', color: 'orange' },
              { id: 'cupped', title: 'Cupped', color: 'purple' },
              { id: 'approved', title: 'Approved', color: 'green' },
            ],
          },
        },
      }),
    ),
    notes: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Notes' }))),
  }).pipe(
    LabelAnnotation.set(['title']),
    Annotation.IconAnnotation.set({ icon: 'ph--fire-simple--regular', hue: 'amber' }),
  ),
);

//
// Roast Log — custom exemplar schema entries + Table / Kanban views
//

const makeRoastLogs = (type: Type.AnyObj, people: Record<PersonKey, Person.Person>): Obj.Any[] => {
  // Stamp objects with the persisted type entity so their `@type` is the space-relative EID,
  // matching how Composer creates objects of database types and the EID the type's views query by.
  // Building from the static schema would stamp the typename DXN instead and miss those filters.
  return [
    // --- approved: past batches that cleared QC ---
    Obj.make(type, {
      title: 'Finca Esperanza Lot #42 — Batch 1',
      date: daysAgo(28),
      origin: 'Colombia / Finca Esperanza / Lot #42',
      machine: 'Loring S15',
      roaster: Ref.make(people.kai),
      greenWeightKg: 15,
      roastWeightKg: 12.6,
      chargeTemp: 205,
      firstCrackTime: '9:18',
      developmentTime: '1:45',
      dropTemp: 209,
      roastLevel: 'city',
      status: 'approved',
      notes:
        'Clean reference curve for the Spring Blend. Berry up front, long chocolate finish. Approved for production.',
    }),
    Obj.make(type, {
      title: 'Finca Esperanza Lot #42 — Batch 2',
      date: daysAgo(21),
      origin: 'Colombia / Finca Esperanza / Lot #42',
      machine: 'Loring S15',
      roaster: Ref.make(people.kai),
      greenWeightKg: 15,
      roastWeightKg: 12.5,
      chargeTemp: 205,
      firstCrackTime: '9:22',
      developmentTime: '1:50',
      dropTemp: 210,
      roastLevel: 'city',
      status: 'approved',
      notes:
        'Confirmed the curve. Added 5 s to development — slightly more body, stone fruit more pronounced. Approved.',
    }),
    Obj.make(type, {
      title: 'Sidamo Coop Natural — Lot 12A',
      date: daysAgo(14),
      origin: 'Ethiopia / Sidamo Cooperative / Natural Lot 12A',
      machine: 'Loring S15',
      roaster: Ref.make(people.diego),
      greenWeightKg: 12,
      roastWeightKg: 10.1,
      chargeTemp: 200,
      firstCrackTime: '8:55',
      developmentTime: '1:30',
      dropTemp: 207,
      roastLevel: 'light',
      status: 'approved',
      notes:
        'Blueberry and lemon zest on the nose. Very clean natural process — excellent for the single-origin filter menu.',
    }),
    // --- cupped: awaiting final approval ---
    Obj.make(type, {
      title: 'Spring Blend — Production Run 1',
      date: daysAgo(5),
      origin: 'Colombia / Finca Esperanza + Ethiopia / Sidamo (70/30)',
      machine: 'Loring S15',
      roaster: Ref.make(people.kai),
      greenWeightKg: 30,
      roastWeightKg: 25.3,
      chargeTemp: 206,
      firstCrackTime: '9:25',
      developmentTime: '1:52',
      dropTemp: 210,
      roastLevel: 'city',
      status: 'cupped',
      notes:
        'First full blend run. Cupped this morning — jasmine and dark cacao hitting the brief. Slight unevenness in the drum; next run increase charge rate 2 %.',
    }),
    // --- roasted: cooling / resting, not yet cupped ---
    Obj.make(type, {
      title: 'Finca Esperanza Lot #42 — Dev Batch',
      date: daysAgo(2),
      origin: 'Colombia / Finca Esperanza / Lot #42',
      machine: 'Loring S15',
      roaster: Ref.make(people.kai),
      greenWeightKg: 5,
      chargeTemp: 203,
      firstCrackTime: '9:10',
      developmentTime: '2:05',
      dropTemp: 211,
      roastLevel: 'city+',
      status: 'roasted',
      notes: 'Longer development trial for espresso use. Resting — cup on day 4.',
    }),
    Obj.make(type, {
      title: 'Honduras El Puente — Sample Lot',
      date: daysAgo(1),
      origin: 'Honduras / Cooperativa El Puente / Sample',
      machine: 'Loring S15',
      roaster: Ref.make(people.diego),
      greenWeightKg: 3,
      chargeTemp: 198,
      firstCrackTime: '8:40',
      developmentTime: '1:25',
      dropTemp: 205,
      roastLevel: 'light',
      status: 'roasted',
      notes: 'New origin evaluation. Resting overnight before cupping.',
    }),
    // --- planned: upcoming ---
    Obj.make(type, {
      title: 'Spring Blend — Production Run 2',
      date: daysFromNow(3),
      origin: 'Colombia / Finca Esperanza + Ethiopia / Sidamo (70/30)',
      machine: 'Loring S15',
      roaster: Ref.make(people.kai),
      greenWeightKg: 30,
      status: 'planned',
      notes: 'Increase charge rate 2 % vs Run 1 to address drum unevenness. Schedule cupping on day 5.',
    }),
    Obj.make(type, {
      title: 'Colombia Huila — Pre-production',
      date: daysFromNow(7),
      origin: 'Colombia / Huila Region / New lot (TBC)',
      machine: 'Loring S15',
      roaster: Ref.make(people.diego),
      greenWeightKg: 10,
      status: 'planned',
      notes: 'Pre-production evaluation for potential Q3 addition. Diego to confirm lot details with supplier.',
    }),
  ];
};

/**
 * Roast batches on a schema the build defines rather than a plugin: `db.addType` stores a TypeSchema
 * ECHO object in the space, and the Table/Kanban plugins resolve the base schema from that at
 * runtime, so the app renders a type it was never compiled against. Table/Kanban are not
 * collection-item types, so the views live directly in the space DB.
 */
export type RoastLogsResult = { entries: Obj.Any[] };

export const RoastLogs: SampleSpace.Phase<RoastLogsResult, PersonMap> = SampleSpace.phase('roastLogs', {
  schemas: [RoastLog, View.View, Table.Table, Kanban.Kanban],
  run: (people: PersonMap) =>
    Effect.gen(function* () {
      const typename = 'example.type.roastLog';

      const roastLogType = yield* Database.addType(RoastLog);
      Type.update(roastLogType, (draft) => {
        draft.name = 'Roast Log';
      });

      const entries = makeRoastLogs(Type.assertObject(roastLogType), people);
      for (const entry of entries) {
        yield* Database.add(entry);
      }

      const { db } = yield* Database.Service;
      const { view: tableView } = yield* Effect.promise(() =>
        ViewModel.makeFromDatabase({
          db,
          typename,
          fields: [
            'title',
            'date',
            'origin',
            'roaster',
            'status',
            'roastLevel',
            'chargeTemp',
            'firstCrackTime',
            'developmentTime',
            'dropTemp',
          ],
        }),
      );
      yield* Database.add(Table.make({ name: 'Table', view: tableView }));

      const { view: kanbanView } = yield* Effect.promise(() =>
        ViewModel.makeFromDatabase({
          db,
          typename,
          fields: ['title', 'origin', 'date', 'roaster', 'notes'],
          pivotFieldName: 'status',
        }),
      );
      yield* Database.add(Kanban.make({ name: 'Kanban', view: kanbanView }));

      return { entries };
    }),
});
