//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { DXN, Filter, Obj, Type } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { EffectEx } from '@dxos/effect';

import { getOrCreate } from './getOrCreate';
import { fromResolvers } from './Resolver';

const Contact = Schema.Struct({
  email: Schema.String,
  name: Schema.optional(Schema.String),
}).pipe(Type.makeObject(DXN.make('com.example.type.Contact', '0.1.0')));
interface Contact extends Type.InstanceType<typeof Contact> {}

describe('getOrCreate', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Contact] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const resolverLayer = () =>
    fromResolvers({
      [Type.getTypename(Contact)!]: ({ email }: { email: string }) =>
        Effect.promise(() => db.query(Filter.type(Contact)).run()).pipe(
          Effect.map((contacts) => contacts.find((contact) => contact.email === email)),
        ),
    });

  test('no existing match — returns the candidate as created', async ({ expect }) => {
    const candidate = Obj.make(Contact, { email: 'new@example.test', name: 'New Person' });
    const { object, created } = await getOrCreate(Contact, candidate, { identity: { email: 'new@example.test' } })
      .pipe(Effect.provide(resolverLayer()))
      .pipe(EffectEx.runAndForwardErrors);

    expect(created).toBe(true);
    expect(object).toBe(candidate);
  });

  test('existing match — merges into the existing object', async ({ expect }) => {
    const existing = db.add(Obj.make(Contact, { email: 'dup@example.test' }));
    await db.flush();

    const candidate = Obj.make(Contact, { email: 'dup@example.test', name: 'Merged Name' });
    const { object, created } = await getOrCreate(Contact, candidate, {
      identity: { email: 'dup@example.test' },
      merge: (target, source) => {
        if (source.name !== undefined) {
          target.name = source.name;
        }
      },
    })
      .pipe(Effect.provide(resolverLayer()))
      .pipe(EffectEx.runAndForwardErrors);

    expect(created).toBe(false);
    expect(object.id).toBe(existing.id);
    expect(object.name).toBe('Merged Name');
  });

  test('no identity — always created', async ({ expect }) => {
    const candidate = Obj.make(Contact, { email: 'any@example.test' });
    const { created } = await getOrCreate(Contact, candidate)
      .pipe(Effect.provide(resolverLayer()))
      .pipe(EffectEx.runAndForwardErrors);

    expect(created).toBe(true);
  });
});
