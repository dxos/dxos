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

import { buildContactFromActor, buildContactGraph, buildOrganizationFromActor } from './contact.ts';
import { identitySpecs } from './identity.ts';
import { getIdentityIndex } from './resolver.ts';

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

describe('buildContactGraph', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Organization.Organization, Person.Person] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const overlay = () =>
    EffectEx.runPromise(Effect.map(getIdentityIndex(db), (shared) => overlayIdentityIndex(identitySpecs, shared)));

  test('creates the Organization for an unknown corporate domain and links the contact', async ({ expect }) => {
    const index = await overlay();
    const graph = await EffectEx.runPromise(
      buildContactGraph({ name: 'Nicole', email: 'nicole@kirkconsult.com' }, db, { index }),
    );
    expect(graph.contact?.fullName).toBe('Nicole');
    expect(graph.organization?.name).toBe('Kirkconsult');
    expect(graph.organization?.website).toBe('https://kirkconsult.com');
    expect(graph.contact?.organization?.target).toBe(graph.organization);
  });

  test('never mints an Organization for a free-mail domain', async ({ expect }) => {
    const index = await overlay();
    const graph = await EffectEx.runPromise(buildContactGraph({ email: 'alice@gmail.com' }, db, { index }));
    expect(graph.contact).toBeDefined();
    expect(graph.organization).toBeUndefined();
  });

  test('links an existing Organization instead of creating a second one', async ({ expect }) => {
    db.add(Obj.make(Organization.Organization, { name: 'Kirk Consulting', website: 'https://kirkconsult.com' }));
    await db.flush({ indexes: true });

    const index = await overlay();
    const graph = await EffectEx.runPromise(buildContactGraph({ email: 'nicole@kirkconsult.com' }, db, { index }));
    expect(graph.contact?.organization?.target?.name).toBe('Kirk Consulting');
    expect(graph.organization).toBeUndefined();
  });

  test('repeat senders at one domain share the run-created Organization', async ({ expect }) => {
    const index = await overlay();
    const first = await EffectEx.runPromise(buildContactGraph({ email: 'nicole@kirkconsult.com' }, db, { index }));
    const second = await EffectEx.runPromise(buildContactGraph({ email: 'maggie@kirkconsult.com' }, db, { index }));
    expect(first.organization).toBeDefined();
    expect(second.organization).toBeUndefined();
    expect(second.contact?.organization?.target).toBe(first.organization);
  });

  test('the gate is evaluated before the Organization exists (no self-admittance)', async ({ expect }) => {
    // A non-outbound sender at an unknown org is denied — creating the org first would have
    // admitted them through the known-Organization allow rule.
    const index = await overlay();
    const graph = await EffectEx.runPromise(
      buildContactGraph({ email: 'stranger@unknowncorp.com' }, db, { index, signals: { outbound: false } }),
    );
    expect(graph.contact).toBeUndefined();
    expect(graph.organization).toBeUndefined();
    expect(await EffectEx.runPromise(buildOrganizationFromActor({ email: 'x@gmail.com' }, db))).toBeUndefined();
  });
});
