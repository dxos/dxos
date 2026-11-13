//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Client } from '@dxos/client';
import {
  Annotation,
  type Database,
  DXN,
  Format,
  JsonSchema,
  Migration,
  Obj,
  Ref,
  Type,
} from '@dxos/echo';

import {
  Event,
  Organization,
  Person,
  types,
} from '../../echo-tutorial/schema.ts';
import { WorksAt } from './works-at.ts';

declare const db: Database.Database;

// #region identity
Type.getTypename(Person); // 'com.example.type.person'
Type.getVersion(Person); // '0.1.0'
Type.getURI(Person); // 'dxn:com.example.type.person:0.1.0'

const ada = Obj.make(Person, { name: 'Ada' });
Obj.getTypename(ada); // 'com.example.type.person'
// #endregion identity

// #region annotations
// The tutorial's Event names `title` as its label.
const labelFields = Annotation.LabelAnnotation.get(Type.getSchema(Event)); // Some(['title'])
const launch = Obj.make(Event, { title: 'Launch' });
Obj.getLabel(launch); // 'Launch'
// #endregion annotations

// #region register
const client = new Client({ types });
await client.initialize();
await client.addTypes([WorksAt]);
// #endregion register

// #region json-schema
const jsonSchema = JsonSchema.toJsonSchema(Type.getSchema(Organization));

const Note = Type.makeObjectFromJsonSchema({
  typename: 'com.example.type.note',
  version: '0.1.0',
  jsonSchema: { type: 'object', properties: { title: { type: 'string' } } },
});
// #endregion json-schema

// #region fields
// Stored in the space, so it replicates to the other members.
const note = await db.addType(Note);
Type.addFields(note, { pinned: Schema.optional(Schema.Boolean) });
// #endregion fields

// #region migration
// Version 0.2.0 of Person holds any number of email addresses.
class PersonV2 extends Type.makeObject<PersonV2>(
  DXN.make('com.example.type.person', '0.2.0'),
)(
  Schema.Struct({
    name: Schema.String,
    emails: Schema.Array(Format.Email),
    employer: Schema.optional(Ref.Ref(Organization)),
  }),
) {}

const personEmails = Migration.define({
  from: Person,
  to: PersonV2,
  transform: async ({ name, email, employer }) => ({
    name,
    emails: email ? [email] : [],
    employer,
  }),
  onMigration: async () => {},
});

// Points every reference to the old typename at the new one.
const renameEvent = Migration.defineRename({
  from: 'com.example.type.event',
  to: 'com.example.type.meeting',
});
// #endregion migration

export { jsonSchema, labelFields, personEmails, renameEvent };
