//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import {
  type Database,
  DXN,
  Filter,
  JsonSchema,
  Obj,
  Query,
  Ref,
  Type,
} from '@dxos/echo';

declare const db: Database.Database;

class Issue extends Type.makeObject<Issue>(
  DXN.make('com.example.type.issue', '0.1.0'),
)(Schema.Struct({ title: Schema.String })) {}

// #region memory
class Memory extends Type.makeObject<Memory>(
  DXN.make('com.example.type.memory', '0.1.0'),
)(
  Schema.Struct({
    title: Schema.String,
    content: Schema.String,
    about: Schema.optional(Ref.Ref(Issue)),
  }),
) {}

const issue = db.add(Obj.make(Issue, { title: 'Sync drops the last page' }));
db.add(
  Obj.make(Memory, {
    title: 'Root cause',
    content: 'The cursor skips short pages.',
    about: Ref.make(issue),
  }),
);

const recalled = await db.query(Query.select(Filter.type(Memory))).run();
// #endregion memory

// #region introspect
const typename = Type.getTypename(Memory);
const version = Type.getVersion(Memory);
const parameters = JsonSchema.toJsonSchema(Memory);

const Contact = Type.makeObjectFromJsonSchema({
  typename: 'com.example.type.contact',
  version: '0.1.0',
  jsonSchema: JsonSchema.toJsonSchema(Schema.Struct({ name: Schema.String })),
});
await db.addType(Contact);
// #endregion introspect

// #region external
const key = { source: 'github.com', id: '1234' };

const [existing] = await db
  .query(Query.select(Filter.foreignKeys(Issue, [key])))
  .run();
if (existing) {
  Obj.update(existing, (existing) => {
    existing.title = 'Sync drops the last page';
  });
} else {
  db.add(
    Obj.make(Issue, {
      [Obj.Meta]: { keys: [key] },
      title: 'Sync drops the last page',
    }),
  );
}
// #endregion external

export { parameters, recalled, typename, version };
