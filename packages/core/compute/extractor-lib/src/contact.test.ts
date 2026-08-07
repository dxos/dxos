//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { overlayIdentityIndex } from '@dxos/extractor';
import { Organization, Person } from '@dxos/types';

import { buildContactFromActor } from './contact';
import { identitySpecs } from './identity';
import { getIdentityIndex } from './resolver';

describe('buildContactFromActor', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Organization.Organization, Person.Person] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  test('returns undefined when the actor has no email', async ({ expect }) => {
    const contact = await EffectEx.runPromise(buildContactFromActor({ name: 'Anonymous' }, db));
    expect(contact).toBeUndefined();
  });

  test('builds a Person and links a matching Organization by domain', async ({ expect }) => {
    db.add(Obj.make(Organization.Organization, { name: 'DXOS', website: 'dxos.org' }));
    await db.flush({ indexes: true });

    const contact = await EffectEx.runPromise(buildContactFromActor({ name: 'Alice', email: 'alice@dxos.org' }, db));
    expect(contact).toBeDefined();
    expect(contact?.fullName).toBe('Alice');
    expect(contact?.emails?.[0]?.value).toBe('alice@dxos.org');
    expect(contact?.organization).toBeDefined();
  });

  test('returns undefined when a Person with the same email already exists', async ({ expect }) => {
    db.add(Obj.make(Person.Person, { fullName: 'Alice', emails: [{ value: 'alice@dxos.org' }] }));
    await db.flush({ indexes: true });

    const contact = await EffectEx.runPromise(buildContactFromActor({ email: 'alice@dxos.org' }, db));
    expect(contact).toBeUndefined();
  });

  test('a repeat sender within a run does not build a second contact', async ({ expect }) => {
    // In-run dedup is the overlay's job: an uncommitted contact is invisible to a query, which is
    // what made the second message from a sender fork a duplicate.
    const index = await EffectEx.runPromise(
      Effect.map(getIdentityIndex(db), (shared) => overlayIdentityIndex(identitySpecs, shared)),
    );
    const first = await EffectEx.runPromise(buildContactFromActor({ email: 'alice@dxos.org' }, db, { index }));
    const second = await EffectEx.runPromise(buildContactFromActor({ email: 'ALICE@dxos.org' }, db, { index }));
    expect(first).toBeDefined();
    expect(second).toBeUndefined();
  });

  test('an uncommitted contact never enters the space-wide index', async ({ expect }) => {
    // A run that dies before committing must not leave the shared index claiming a contact the
    // space never received — the next run would then never create one for that sender.
    const built = await EffectEx.runPromise(buildContactFromActor({ email: 'alice@dxos.org' }, db));
    expect(built).toBeDefined();

    const shared = await EffectEx.runPromise(getIdentityIndex(db));
    expect(shared.lookup(Person.Person, { email: 'alice@dxos.org' })).toBeUndefined();
  });
});
