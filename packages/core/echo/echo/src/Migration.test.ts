//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Lens from './Lens.ts';
import * as Migration from './Migration.ts';
import * as Type from './Type.ts';

//
// Define-time behaviour of `Migration.fromLens`: the lens's own coverage report is what decides
// whether a migration is even allowed to exist, before any object is touched.
//

const ContactV1 = Type.makeObject(DXN.make('org.dxos.test.migration.contact', '0.1.0'))(
  Schema.Struct({
    firstName: Schema.String,
    lastName: Schema.String,
    legacyNote: Schema.optional(Schema.String),
  }),
);

const ContactV2 = Type.makeObject(DXN.make('org.dxos.test.migration.contact', '0.2.0'))(
  Schema.Struct({
    name: Schema.String,
  }),
);

/** `legacyNote` is read by nothing, so it reports as `dropped` — the case `allowDropped` exists for. */
const contactLens = () =>
  Lens.make('org.dxos.test.migration.lens.contact', ContactV1, ContactV2, {
    name: {
      from: ['firstName', 'lastName'],
      get: ({ firstName, lastName }) => `${firstName} ${lastName}`,
    },
  });

const StatusA = Type.makeObject(DXN.make('org.dxos.test.migration.statusA', '0.1.0'))(
  Schema.Struct({
    status: Schema.optional(Schema.Literals(['todo', 'done'])),
  }),
);

const StatusB = Type.makeObject(DXN.make('org.dxos.test.migration.statusB', '0.1.0'))(
  Schema.Struct({
    // Same name as `StatusA.status`, incompatible vocabulary — a same-name/incompatible-type match.
    status: Schema.optional(Schema.Literals(['open', 'closed'])),
  }),
);

const PersonV1 = Type.makeObject(DXN.make('org.dxos.test.migration.person', '0.1.0'))(
  Schema.Struct({
    firstName: Schema.String,
    lastName: Schema.String,
  }),
);

const PersonV2 = Type.makeObject(DXN.make('org.dxos.test.migration.person', '0.2.0'))(
  Schema.Struct({
    name: Schema.String,
  }),
);

/** Every source property is read, so coverage has nothing dropped and nothing suspicious. */
const personLens = () =>
  Lens.make('org.dxos.test.migration.lens.person', PersonV1, PersonV2, {
    name: {
      from: ['firstName', 'lastName'],
      get: ({ firstName, lastName }) => `${firstName} ${lastName}`,
      put: (name: string | undefined, { lastName }) => {
        const [first, ...rest] = (name ?? '').split(' ');
        return { firstName: first, lastName: rest.length > 0 ? rest.join(' ') : lastName };
      },
    },
  });

describe('Migration.fromLens', () => {
  test('a lens that drops a property fails unless the property is allowed', ({ expect }) => {
    expect(() => Migration.fromLens(contactLens())).to.throw(/legacyNote/);
    expect(() => Migration.fromLens(contactLens(), { allowDropped: ['legacyNote'] })).not.to.throw();
  });

  test('a lens with a suspicious mapping fails, listing the property and its candidates', ({ expect }) => {
    const lens = Lens.make('org.dxos.test.migration.lens.suspicious', StatusA, StatusB, {});
    expect(() => Migration.fromLens(lens)).to.throw(/suspicious/);
    expect(() => Migration.fromLens(lens)).to.throw(/status/);
  });

  test('a clean lens produces an object migration carrying the lens and its types', ({ expect }) => {
    const lens = personLens();
    const migration = Migration.fromLens(lens);

    expect(migration.kind).to.eq('object');
    expect(migration.fromType.toString()).to.eq(Type.getURI(PersonV1).toString());
    expect(migration.toType.toString()).to.eq(Type.getURI(PersonV2).toString());
    expect(migration.lens).to.eq(lens);
  });

  test('a lens targeting a plain schema is rejected: a migration target must be a declared type', ({ expect }) => {
    const lens = Lens.make('org.dxos.test.migration.lens.plain', PersonV1, Schema.Struct({ name: Schema.String }), {
      name: {
        from: ['firstName', 'lastName'],
        get: ({ firstName, lastName }) => `${firstName} ${lastName}`,
      },
    });
    expect(() => Migration.fromLens(lens)).to.throw(/plain schema/);
  });
});
