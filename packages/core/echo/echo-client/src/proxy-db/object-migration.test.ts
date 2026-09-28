//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { Annotation, Filter, Lens, Migration, Obj, Type } from '@dxos/echo';
import { DATA_NAMESPACE } from '@dxos/echo-protocol';
import { SchemaEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';

import { EchoTestBuilder, getObjectCore } from '../testing/index.ts';
import { defineObjectMigration } from './object-migration.ts';

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

const ContactV1 = Type.makeObject(DXN.make('com.example.type.person', '0.1.0'))(
  Schema.Struct({
    firstName: Schema.String,
    lastName: Schema.String,
  }),
);

const ContactV2 = Type.makeObject(DXN.make('com.example.type.person', '0.2.0'))(
  Schema.Struct({
    name: Schema.String,
  }),
);

const ContactV3 = Type.makeObject(DXN.make('com.example.type.person', '0.3.0'))(
  Schema.Struct({
    name: Schema.String,
    email: Schema.String,
  }),
);

const migrationV2 = defineObjectMigration({
  from: ContactV1,
  to: ContactV2,
  transform: async (from) => {
    return { name: `${from.firstName} ${from.lastName}` };
  },
  onMigration: async () => {},
});

const migrationV3 = defineObjectMigration({
  from: ContactV2,
  to: ContactV3,
  transform: async (from) => {
    return { ...from, email: `${from.name.toLocaleLowerCase().replaceAll(' ', '.')}@example.com` };
  },
  onMigration: async () => {},
});

test('migrate 1 object', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([ContactV1, ContactV2]);

  db.add(Obj.make(ContactV1, { firstName: 'John', lastName: 'Doe' }));
  await db.flush();
  await db.runMigrations([migrationV2]);

  const objects = await db.query(Filter.type(ContactV2)).run();
  expect(objects).to.have.length(1);

  expect(Type.getURI(Obj.getType(objects[0])!)?.toString()).to.eq(DXN.make('com.example.type.person', '0.2.0'));
  expect(Obj.getTypename(objects[0])).to.eq('com.example.type.person');
  expect(Type.getVersion(Obj.getType(objects[0])!)).to.eq('0.2.0');
  expect(objects[0].name).to.eq('John Doe');
});

test('incrementally migrates new objects', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([ContactV1, ContactV2]);

  db.add(Obj.make(ContactV1, { firstName: 'John', lastName: 'Doe' }));
  await db.flush();
  await db.runMigrations([migrationV2]);

  {
    const objects = await db.query(Filter.type(ContactV2)).run();
    expect(objects).to.have.length(1);
    expect(objects[0].name).to.eq('John Doe');
  }

  db.add(Obj.make(ContactV1, { firstName: 'Jane', lastName: 'Smith' }));
  await db.flush();
  await db.runMigrations([migrationV2]);

  {
    const objects = await db.query(Filter.type(ContactV2)).run();
    expect(objects).to.have.length(2);
    expect(objects[0].name).to.eq('John Doe');
    expect(objects[1].name).to.eq('Jane Smith');
  }

  await db.runMigrations([migrationV2]);

  {
    const objects = await db.query(Filter.type(ContactV2)).run();
    expect(objects).to.have.length(2);
    expect(objects[0].name).to.eq('John Doe');
    expect(objects[1].name).to.eq('Jane Smith');
  }
});

test('migration moves data key/version into meta', async () => {
  const RegistryEntryV1 = Type.makeObject(DXN.make('com.example.type.registryEntry', '0.1.0'))(
    Schema.Struct({
      key: Schema.String,
      name: Schema.String,
      version: Schema.String,
    }),
  );

  const RegistryEntryV2 = Type.makeObject(DXN.make('com.example.type.registryEntry', '0.2.0'))(
    Schema.Struct({
      name: Schema.String,
    }),
  );

  const migration = defineObjectMigration({
    from: RegistryEntryV1,
    to: RegistryEntryV2,
    transform: async (from) => ({
      [Obj.Meta]: { key: from.key, version: from.version },
      name: from.name,
    }),
  });

  const { db, graph } = await builder.createDatabase();
  graph.registry.add([RegistryEntryV1, RegistryEntryV2]);

  db.add(
    Obj.make(RegistryEntryV1, {
      key: 'com.example.type.foo',
      name: 'foo',
      version: '1.2.3',
    }),
  );
  await db.flush();
  await db.runMigrations([migration]);

  const objects = await db.query(Filter.type(RegistryEntryV2)).run();
  expect(objects).to.have.length(1);
  expect(objects[0].name).to.eq('foo');
  expect(Obj.getMeta(objects[0]).key).to.eq('com.example.type.foo');
  expect(Obj.getMeta(objects[0]).version).to.eq('1.2.3');

  // The migrated object should be queryable by its meta key.
  const byKey = await db.query(Filter.and(Filter.type(RegistryEntryV2), Filter.key('com.example.type.foo'))).run();
  expect(byKey).to.have.length(1);

  // And by semver range.
  const byRange = await db
    .query(Filter.and(Filter.type(RegistryEntryV2), Filter.key('com.example.type.foo', { version: '^1.0.0' })))
    .run();
  expect(byRange).to.have.length(1);
});

test('chained migrations', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([ContactV1, ContactV2, ContactV3]);

  db.add(Obj.make(ContactV1, { firstName: 'John', lastName: 'Doe' }));
  await db.flush();
  await db.runMigrations([migrationV2, migrationV3]);

  const objects = await db.query(Filter.type(ContactV3)).run();
  expect(objects).to.have.length(1);
  expect(Obj.getTypename(objects[0])).to.eq('com.example.type.person');
  expect(Type.getVersion(Obj.getType(objects[0])!)).to.eq('0.3.0');
  expect(objects[0].name).to.eq('John Doe');
  expect(objects[0].email).to.eq('john.doe@example.com');

  // Both hops are kept, oldest first: an object migrated `@1 -> @2 -> @3` carries both steps, not just
  // the latest one, so a late `@1`-shaped write can still be folded all the way forward.
  const marker = Option.getOrThrow(Annotation.get(objects[0], Migration.MigrationMarkerAnnotation));
  const steps = Migration.getSteps(marker);
  expect(steps).to.have.length(2);
  expect(steps[0].from).to.eq(migrationV2.fromType.toString());
  expect(steps[0].to).to.eq(migrationV2.toType.toString());
  expect(steps[1].from).to.eq(migrationV3.fromType.toString());
  expect(steps[1].to).to.eq(migrationV3.toType.toString());
});

test('applies the write set, the type switch, and the marker in exactly one automerge change, named for the migration', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([ContactV1, ContactV2]);

  const contact = db.add(Obj.make(ContactV1, { firstName: 'Ada', lastName: 'Lovelace' }));
  await db.flush();
  const core = getObjectCore(contact);
  const historyBefore = A.getHistory(core.getDoc()).length;

  await db.runMigrations([migrationV2]);

  const history = A.getHistory(core.getDoc());
  // A dependency-free change is a document genesis the host side can contribute late, not an edit.
  const edits = history.slice(historyBefore).filter((entry) => entry.change.deps.length > 0);
  expect(edits).to.have.length(1);
  expect(edits[0].change.message).to.eq(
    `migration: ${migrationV2.fromType.toString()} -> ${migrationV2.toType.toString()}`,
  );
});

test('does not write a data key whose transformed value is unchanged', async () => {
  const ProfileV1 = Type.makeObject(DXN.make('com.example.type.migrationProfile', '0.1.0'))(
    Schema.Struct({ handle: Schema.String, bio: Schema.String }),
  );
  const ProfileV2 = Type.makeObject(DXN.make('com.example.type.migrationProfile', '0.2.0'))(
    Schema.Struct({ handle: Schema.String, bio: Schema.String }),
  );
  // A pure type bump: every data value is carried over unchanged.
  const profileMigration = defineObjectMigration({
    from: ProfileV1,
    to: ProfileV2,
    transform: async (from) => ({ handle: from.handle, bio: from.bio }),
  });

  const { db, graph } = await builder.createDatabase();
  graph.registry.add([ProfileV1, ProfileV2]);

  const profile = db.add(Obj.make(ProfileV1, { handle: '@ada', bio: 'Mathematician' }));
  await db.flush();
  const core = getObjectCore(profile);
  const preHeads = A.getHeads(core.getDoc());

  await db.runMigrations([profileMigration]);

  const touchesDataKey = (key: string): boolean =>
    A.diff(core.getDoc(), preHeads, A.getHeads(core.getDoc())).some((patch) =>
      patch.path.some((segment, index) => segment === DATA_NAMESPACE && patch.path[index + 1] === key),
    );
  expect(touchesDataKey('handle')).to.eq(false);
  expect(touchesDataKey('bio')).to.eq(false);

  // The type switch and the marker still land — this is a value-compare guard on individual keys,
  // not a shortcut that skips the whole change when nothing in the data changed.
  expect(Obj.getTypeURI(profile)?.toString()).to.eq(DXN.make('com.example.type.migrationProfile', '0.2.0'));
});

test('retires a field the transform drops instead of deleting it, and marks the object with the pre-migration heads', async () => {
  const NoteV1 = Type.makeObject(DXN.make('com.example.type.migrationNote', '0.1.0'))(
    Schema.Struct({ title: Schema.String, body: Schema.String }),
  );
  const NoteV2 = Type.makeObject(DXN.make('com.example.type.migrationNote', '0.2.0'))(
    Schema.Struct({ title: Schema.String }),
  );
  const noteMigration = defineObjectMigration({
    from: NoteV1,
    to: NoteV2,
    transform: async (from) => ({ title: from.title }),
  });

  const { db, graph } = await builder.createDatabase();
  graph.registry.add([NoteV1, NoteV2]);

  const note = db.add(Obj.make(NoteV1, { title: 'Title', body: 'Body' }));
  await db.flush();
  const preHeads = A.getHeads(getObjectCore(note).getDoc());

  await db.runMigrations([noteMigration]);

  // Retained, not deleted: `body` has no home in `NoteV2` but stays readable off the raw path.
  expect(Obj.getValue(note, ['body'])).to.eq('Body');
  expect(Obj.getTypeURI(note)?.toString()).to.eq(DXN.make('com.example.type.migrationNote', '0.2.0'));

  const marker = Option.getOrThrow(Annotation.get(note, Migration.MigrationMarkerAnnotation));
  const [step] = Migration.getSteps(marker);
  expect(step.from).to.eq(noteMigration.fromType.toString());
  expect(step.to).to.eq(noteMigration.toType.toString());
  expect(step.preHeads).to.deep.eq(preHeads);
  expect(step.retired).to.deep.eq(['body']);
});

test('re-running a migration after it applied performs no further writes', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([ContactV1, ContactV2]);

  const contact = db.add(Obj.make(ContactV1, { firstName: 'Grace', lastName: 'Hopper' }));
  await db.flush();
  await db.runMigrations([migrationV2]);

  const core = getObjectCore(contact);
  const migrationMessagesBefore = A.getHistory(core.getDoc()).filter((entry) =>
    entry.change.message?.startsWith('migration:'),
  );

  // The object no longer matches `fromType`, so a second run's query finds nothing to migrate — no
  // second `migration: ...` change lands, whatever unrelated background activity the doc also sees.
  await db.runMigrations([migrationV2]);
  const migrationMessagesAfter = A.getHistory(core.getDoc()).filter((entry) =>
    entry.change.message?.startsWith('migration:'),
  );
  expect(migrationMessagesAfter).to.have.length(migrationMessagesBefore.length);
});

const TaskV1 = Type.makeObject(DXN.make('com.example.type.migrationTask', '0.1.0'))(
  Schema.Struct({
    title: Schema.String,
    status: Schema.optional(Schema.Literals(['todo', 'done'])),
    legacyEstimate: Schema.optional(Schema.Number),
  }),
);

const TaskV2 = Type.makeObject(DXN.make('com.example.type.migrationTask', '0.2.0'))(
  Schema.Struct({
    title: Schema.String,
    done: Schema.optional(Schema.Boolean),
    // No counterpart on `TaskV1` — overlay-backed until a migration promotes it (DESIGN §10.7 q1).
    context: Schema.optional(Schema.Literals(['@home', '@work'])),
  }),
);

const TASK_LENS_ID = 'com.example.type.migrationTask.lens';

/** `title` matches by name; `done` is a converted view of `status`; `legacyEstimate` is unread. */
const taskLens = () =>
  Lens.make(TASK_LENS_ID, TaskV1, TaskV2, {
    done: {
      from: ['status'],
      get: ({ status }) => status === 'done',
      put: (done: boolean | undefined, { status }) => ({
        status: done === true ? ('done' as const) : status === 'done' ? ('todo' as const) : status,
      }),
    },
  });

const NoteV1 = Type.makeObject(DXN.make('com.example.type.migrationLossyNote', '0.1.0'))(
  Schema.Struct({ title: Schema.String }),
);

const NoteV2 = Type.makeObject(DXN.make('com.example.type.migrationLossyNote', '0.2.0'))(
  Schema.Struct({ initial: Schema.optional(Schema.String) }),
);

/** Reading the first character is not invertible, so `checkLaws` fails against any real title. */
const lossyLens = () =>
  Lens.make('com.example.type.migrationLossyNote.lens', NoteV1, NoteV2, {
    initial: {
      from: ['title'],
      get: ({ title }) => title?.[0],
      put: (initial: string | undefined) => ({ title: initial ?? '' }),
    },
  });

test('Migration.fromLens: type switch, converted value, retired drop, and overlay promotion', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([TaskV1, TaskV2]);

  const lens = taskLens();
  const task = db.add(Obj.make(TaskV1, { title: 'Ship it', status: 'done', legacyEstimate: 5 }));
  // Set before the migration runs, on the source object: this is the overlay a migration promotes.
  Lens.put(task, lens, { context: '@work' });
  await db.flush();

  await db.runMigrations([Migration.fromLens(lens, { allowDropped: ['legacyEstimate'] })]);

  const objects = await db.query(Filter.type(TaskV2)).run();
  expect(objects).to.have.length(1);
  const [migrated] = objects;

  expect(Obj.getTypeURI(migrated)?.toString()).to.eq(DXN.make('com.example.type.migrationTask', '0.2.0'));
  expect(migrated.title).to.eq('Ship it');
  // The converted value: `status: 'done'` became `done: true`.
  expect(migrated.done).to.eq(true);
  // The overlay value set on the source object landed as a real property on the target.
  expect(migrated.context).to.eq('@work');
  // Retired, not deleted: `legacyEstimate` has no home in `TaskV2` but stays readable off the raw path.
  expect(Obj.getValue(migrated, ['legacyEstimate'])).to.eq(5);
});

test('Migration.fromLens: a law-violating lens throws before writing', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([NoteV1, NoteV2]);

  const note = db.add(Obj.make(NoteV1, { title: 'Ada' }));
  await db.flush();
  const core = getObjectCore(note);
  const preHeads = A.getHeads(core.getDoc());

  await expect(db.runMigrations([Migration.fromLens(lossyLens())])).rejects.toThrow(/GetPut/);

  // Nothing was written: still the original type and the original heads.
  expect(Obj.getTypeURI(note)?.toString()).to.eq(DXN.make('com.example.type.migrationLossyNote', '0.1.0'));
  expect(A.getHeads(core.getDoc())).to.deep.eq(preHeads);
});

// TODO(wittjosiah): Strip down to minimal example. Key thing this is testing is arrays.
// test('view migration', async () => {
//   const { db, graph } = await builder.createDatabase();
//   db.add(ViewTypeV1);
//   db.add(ViewTypeV2);

//   db.add(
//     Obj.make(ViewTypeV1, {
//       fields: [
//         { id: '8cb60541', path: 'name' as SchemaEx.JsonPath },
//         { id: '902dd8b5', path: 'email' as SchemaEx.JsonPath },
//         { id: 'e288952b', path: 'salary' as SchemaEx.JsonPath, size: 150 },
//         { id: 'cbdc987c', path: 'active' as SchemaEx.JsonPath, size: 100 },
//         { id: '922fd882', path: 'manager' as SchemaEx.JsonPath, referencePath: 'name' as SchemaEx.JsonPath },
//       ],
//       name: 'View',
//       query: { type: 'com.example.type.b1e66ff8' },
//     }),
//   );
//   await db.flush();
//   await db.runMigrations([ViewTypeV1ToV2]);

//   const objects = await db.query(Filter.type(ViewTypeV2)).run();
//   expect(objects).to.have.length(1);
// });

export const FieldSchema = Schema.Struct({
  id: Schema.String,
  path: SchemaEx.JsonPath,
  visible: Schema.optional(Schema.Boolean),
  size: Schema.optional(Schema.Number),
  referencePath: Schema.optional(SchemaEx.JsonPath),
});

export type FieldType = Schema.Schema.Type<typeof FieldSchema>;

test('a run that fails partway is completed by the next run, each object migrated exactly once', async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([ContactV1, ContactV2]);

  const contacts = ['Ada', 'Grace', 'Katherine'].map((firstName) =>
    db.add(Obj.make(ContactV1, { firstName, lastName: 'Test' })),
  );
  await db.flush();

  // Simulates a crash mid-space: the first run dies on its second object.
  let failOn: string | undefined = contacts[1].id;
  const flaky = Migration.define({
    from: ContactV1,
    to: ContactV2,
    transform: async (from) => {
      if (from.id === failOn) {
        throw new Error('simulated crash');
      }
      return { name: `${from.firstName} ${from.lastName}` };
    },
  });

  await expect(db.runMigrations([flaky])).rejects.toThrow('simulated crash');
  const migratedAfterCrash = contacts.filter(
    (contact) => Obj.getTypeURI(contact)?.toString() === DXN.make('com.example.type.person', '0.2.0'),
  );
  expect(migratedAfterCrash.length).to.be.lessThan(contacts.length);

  failOn = undefined;
  await db.runMigrations([flaky]);

  for (const contact of contacts) {
    expect(Obj.getTypeURI(contact)?.toString()).to.eq(DXN.make('com.example.type.person', '0.2.0'));
    const migrationChanges = A.getHistory(getObjectCore(contact).getDoc()).filter((entry) =>
      entry.change.message?.startsWith('migration:'),
    );
    expect(migrationChanges).to.have.length(1);
  }
});
