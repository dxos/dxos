//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Migration, Ref, Type } from '@dxos/echo';

import { Organization, Person } from '../../tutorial/schema.ts';

// #region define
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
  // Returns the fields of the new version. The id stays the same.
  transform: async ({ name, email, employer }) => ({
    name,
    emails: email ? [email] : [],
    employer,
  }),
  // Runs after the object is migrated, for changes to other objects.
  onMigration: async () => {},
});
// #endregion define

// #region rename
const renameEvent = Migration.defineRename({
  from: 'com.example.type.event',
  to: 'com.example.type.meeting',
});
// #endregion rename

// #region content
class Diagram extends Type.makeObject<Diagram>(
  DXN.make('com.example.type.diagram', '0.1.0'),
)(
  Schema.Struct({
    format: Schema.String.pipe(
      Annotation.ContentVersionAnnotation.set({ fields: ['shapes'] }),
      Schema.optional,
    ),
    shapes: Schema.Record(Schema.String, Schema.Any),
  }),
) {}

// Shapes in format 2 store their size as one field.
const shapeSize = Migration.defineContent({
  type: Diagram,
  from: 'com.example.diagram/1',
  to: 'com.example.diagram/2',
  since: '0.3.0',
  transform: ({ shapes }) => ({
    shapes: Object.fromEntries(
      Object.entries(shapes as Record<string, { w: number; h: number }>).map(
        ([id, { w, h }]) => [id, { size: [w, h] }],
      ),
    ),
  }),
});
// #endregion content

export { personEmails, renameEvent, shapeSize };
