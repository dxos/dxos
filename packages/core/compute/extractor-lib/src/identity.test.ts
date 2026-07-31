//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Ref } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { applyMerge, buildIdentityIndex, findDuplicates, identityKeys, planMerge } from '@dxos/extractor';
import { Organization, Person } from '@dxos/types';

import { identitySpecs, normalizePhone, organizationIdentitySpec, personIdentitySpec } from './identity';

const GOOGLE = 'google.com/contacts';

describe('personIdentitySpec', () => {
  test('keys are normalized email addresses', ({ expect }) => {
    const person = Person.make({ emails: [{ value: 'Alice@DXOS.org' }, { label: 'work', value: 'a@dxos.org' }] });
    expect(personIdentitySpec.keys(person)).toEqual(['email:alice@dxos.org', 'email:a@dxos.org']);
  });

  test('a person with no email carries no keys', ({ expect }) => {
    expect(personIdentitySpec.keys(Person.make({ fullName: 'Anonymous' }))).toEqual([]);
  });

  test('inputKeys matches the keys derived from an object', ({ expect }) => {
    const person = Person.make({ emails: [{ value: 'alice@dxos.org' }] });
    expect(personIdentitySpec.inputKeys({ email: ' ALICE@dxos.org ' })).toEqual(personIdentitySpec.keys(person));
  });

  test('identityKeys folds in foreign keys so external ids participate', ({ expect }) => {
    const person = Person.make({
      [Obj.Meta]: { keys: [{ source: GOOGLE, id: 'people/c1' }] },
      emails: [{ value: 'alice@dxos.org' }],
    });
    expect(identityKeys(personIdentitySpec, person)).toEqual(['email:alice@dxos.org', `fk:${GOOGLE}:people/c1`]);
  });
});

describe('findDuplicates', () => {
  test('groups people sharing an email, ignoring case and whitespace', ({ expect }) => {
    const objects = [
      Person.make({ fullName: 'Alice', emails: [{ value: 'alice@dxos.org' }] }),
      Person.make({ fullName: 'Alice B', emails: [{ value: 'ALICE@dxos.org' }] }),
      Person.make({ fullName: 'Bob', emails: [{ value: 'bob@dxos.org' }] }),
    ];

    const groups = findDuplicates(personIdentitySpec, objects);
    expect(groups).toHaveLength(1);
    expect(groups[0].objects.map((person) => person.fullName).sort()).toEqual(['Alice', 'Alice B']);
    expect(groups[0].keys).toEqual(['email:alice@dxos.org']);
  });

  test('different addresses at the same domain are NOT duplicates', ({ expect }) => {
    const objects = [
      Person.make({ fullName: 'DXOS', emails: [{ value: 'no-reply@dxos.org' }] }),
      Person.make({ fullName: 'DXOS via TestFlight', emails: [{ value: 'testflight@email.apple.com' }] }),
    ];
    expect(findDuplicates(personIdentitySpec, objects)).toEqual([]);
  });

  test('people with no identity key are never grouped', ({ expect }) => {
    const objects = [Person.make({ fullName: 'Anonymous' }), Person.make({ fullName: 'Anonymous' })];
    expect(findDuplicates(personIdentitySpec, objects)).toEqual([]);
  });

  test('a foreign key links a mail-sourced person to the same human from Google Contacts', ({ expect }) => {
    // The exact F2 failure: Google sync keys only on `resourceName`, mail sync only on email.
    const objects = [
      Person.make({ fullName: 'Alice', emails: [{ value: 'alice@dxos.org' }] }),
      Person.make({
        [Obj.Meta]: { keys: [{ source: GOOGLE, id: 'people/c1' }] },
        fullName: 'Alice Smith',
        emails: [{ value: 'alice@dxos.org' }, { value: 'alice@personal.com' }],
      }),
    ];

    const groups = findDuplicates(personIdentitySpec, objects);
    expect(groups).toHaveLength(1);
    expect(groups[0].objects).toHaveLength(2);
  });

  test('transitively closes over chained keys', ({ expect }) => {
    // A~B by email, B~C by foreign key: all three are one entity.
    const objects = [
      Person.make({ fullName: 'A', emails: [{ value: 'a@dxos.org' }] }),
      Person.make({
        [Obj.Meta]: { keys: [{ source: GOOGLE, id: 'people/c1' }] },
        fullName: 'B',
        emails: [{ value: 'a@dxos.org' }],
      }),
      Person.make({
        [Obj.Meta]: { keys: [{ source: GOOGLE, id: 'people/c1' }] },
        fullName: 'C',
        emails: [{ value: 'c@dxos.org' }],
      }),
    ];

    const groups = findDuplicates(personIdentitySpec, objects);
    expect(groups).toHaveLength(1);
    expect(groups[0].objects.map((person) => person.fullName).sort()).toEqual(['A', 'B', 'C']);
  });

  test('returns the largest group first', ({ expect }) => {
    const objects = [
      Person.make({ emails: [{ value: 'a@dxos.org' }] }),
      Person.make({ emails: [{ value: 'a@dxos.org' }] }),
      Person.make({ emails: [{ value: 'b@dxos.org' }] }),
      Person.make({ emails: [{ value: 'b@dxos.org' }] }),
      Person.make({ emails: [{ value: 'b@dxos.org' }] }),
    ];

    const groups = findDuplicates(personIdentitySpec, objects);
    expect(groups.map((group) => group.objects.length)).toEqual([3, 2]);
  });
});

describe('planMerge', () => {
  test('the survivor is the lowest EntityId and the preview keeps its scalars', ({ expect }) => {
    const objects = [
      Person.make({ id: '01000000000000000000000001', fullName: 'Alice', emails: [{ value: 'a@dxos.org' }] }),
      Person.make({
        id: '01000000000000000000000002',
        fullName: 'Alice Smith',
        jobTitle: 'Engineer',
        emails: [{ value: 'a@dxos.org' }, { value: 'alice@personal.com' }],
      }),
    ];

    const [group] = findDuplicates(personIdentitySpec, objects);
    const plan = planMerge(personIdentitySpec, group);
    expect(plan.survivor.id).toBe('01000000000000000000000001');
    expect(plan.losers.map((person) => person.id)).toEqual(['01000000000000000000000002']);

    // Survivor's scalar wins; the loser fills a gap; emails are unioned.
    expect(plan.preview.fullName).toBe('Alice');
    expect(plan.preview.jobTitle).toBe('Engineer');
    expect(plan.preview.emails?.map((email) => email.value)).toEqual(['a@dxos.org', 'alice@personal.com']);
  });

  test('the preview is detached — planning writes nothing', ({ expect }) => {
    const objects = [
      Person.make({ id: '01000000000000000000000001', fullName: 'Alice', emails: [{ value: 'a@dxos.org' }] }),
      Person.make({ id: '01000000000000000000000002', fullName: 'Alice B', emails: [{ value: 'a@dxos.org' }] }),
    ];

    const [group] = findDuplicates(personIdentitySpec, objects);
    const plan = planMerge(personIdentitySpec, group);
    expect(plan.preview.id).not.toBe(plan.survivor.id);
    expect(objects[0].fullName).toBe('Alice');
    expect(objects[1].fullName).toBe('Alice B');
  });

  test('email values are rewritten to their canonical form', ({ expect }) => {
    const objects = [
      Person.make({ id: '01000000000000000000000001', emails: [{ value: 'Alice@DXOS.org' }] }),
      Person.make({ id: '01000000000000000000000002', emails: [{ value: 'alice@dxos.org' }] }),
    ];

    const [group] = findDuplicates(personIdentitySpec, objects);
    expect(planMerge(personIdentitySpec, group).preview.emails?.map((email) => email.value)).toEqual([
      'alice@dxos.org',
    ]);
  });

  test('phone numbers are unioned on digits, not on formatting', ({ expect }) => {
    const objects = [
      Person.make({
        id: '01000000000000000000000001',
        emails: [{ value: 'a@dxos.org' }],
        phoneNumbers: [{ value: '+1 (415) 555-0100' }],
      }),
      Person.make({
        id: '01000000000000000000000002',
        emails: [{ value: 'a@dxos.org' }],
        phoneNumbers: [{ value: '+14155550100' }, { value: '+14155550101' }],
      }),
    ];

    const [group] = findDuplicates(personIdentitySpec, objects);
    expect(planMerge(personIdentitySpec, group).preview.phoneNumbers?.map((phone) => phone.value)).toEqual([
      '+1 (415) 555-0100',
      '+14155550101',
    ]);
  });
});

describe('applyMerge', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Organization.Organization, Person.Person] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  test('folds losers into the survivor, transfers foreign keys, and removes them', async ({ expect }) => {
    const survivor = db.add(Person.make({ fullName: 'Alice', emails: [{ value: 'alice@dxos.org' }] }));
    const loser = db.add(
      Person.make({
        [Obj.Meta]: { keys: [{ source: GOOGLE, id: 'people/c1' }] },
        jobTitle: 'Engineer',
        emails: [{ value: 'alice@dxos.org' }, { value: 'alice@personal.com' }],
      }),
    );
    await db.flush({ indexes: true });

    const [group] = findDuplicates(personIdentitySpec, [survivor, loser]);
    const plan = planMerge(personIdentitySpec, group);
    await EffectEx.runPromise(applyMerge(db, personIdentitySpec, plan));

    expect(survivor.fullName).toBe('Alice');
    expect(survivor.jobTitle).toBe('Engineer');
    expect(survivor.emails?.map((email) => email.value)).toEqual(['alice@dxos.org', 'alice@personal.com']);
    // The Google resource name now resolves to the survivor, so the next sync updates rather than re-creates.
    expect(Obj.getKeys(survivor, GOOGLE).map((key) => key.id)).toEqual(['people/c1']);
    expect(Obj.isDeleted(loser)).toBe(true);
  });

  test('user edits to the preview win over the computed merge', async ({ expect }) => {
    const survivor = db.add(Person.make({ fullName: 'Alice', emails: [{ value: 'alice@dxos.org' }] }));
    const loser = db.add(Person.make({ fullName: 'Alice B', emails: [{ value: 'alice@dxos.org' }] }));
    await db.flush({ indexes: true });

    const [group] = findDuplicates(personIdentitySpec, [survivor, loser]);
    const plan = planMerge(personIdentitySpec, group);
    const overrides = Person.make({ fullName: 'Alice Smith', jobTitle: 'Engineer' });
    await EffectEx.runPromise(applyMerge(db, personIdentitySpec, plan, overrides));

    // The confirmed draft is the user's decision, so it wins even where the survivor had a value.
    expect(survivor.fullName).toBe('Alice Smith');
    expect(survivor.jobTitle).toBe('Engineer');
  });

  test('the merged survivor is no longer reported as a duplicate', async ({ expect }) => {
    const survivor = db.add(Person.make({ fullName: 'Alice', emails: [{ value: 'alice@dxos.org' }] }));
    const loser = db.add(Person.make({ fullName: 'Alice B', emails: [{ value: 'ALICE@dxos.org' }] }));
    await db.flush({ indexes: true });

    const [group] = findDuplicates(personIdentitySpec, [survivor, loser]);
    await EffectEx.runPromise(applyMerge(db, personIdentitySpec, planMerge(personIdentitySpec, group)));

    const remaining = await db.query(Filter.type(Person.Person)).run();
    expect(findDuplicates(personIdentitySpec, remaining)).toEqual([]);
  });
});

describe('organizationIdentitySpec', () => {
  test('keys on the website hostname, however the website was written', ({ expect }) => {
    const bare = Organization.make({ name: 'DXOS', website: 'dxos.org' });
    const url = Organization.make({ name: 'DXOS Inc', website: 'https://dxos.org/about' });
    expect(organizationIdentitySpec.keys(bare)).toEqual(['domain:dxos.org']);
    expect(findDuplicates(organizationIdentitySpec, [bare, url])).toHaveLength(1);
  });

  test('inputKeys derives the domain from a sender email', ({ expect }) => {
    expect(organizationIdentitySpec.inputKeys({ email: 'alice@DXOS.org' })).toEqual(['domain:dxos.org']);
  });

  test('merging keeps the survivor name and fills the missing website', ({ expect }) => {
    const objects = [
      Organization.make({ id: '01000000000000000000000001', name: 'DXOS', website: 'dxos.org' }),
      Organization.make({ id: '01000000000000000000000002', name: 'DXOS Inc', website: 'dxos.org' }),
    ];
    const [group] = findDuplicates(organizationIdentitySpec, objects);
    expect(planMerge(organizationIdentitySpec, group).preview.name).toBe('DXOS');
  });

  test('an organization with a matching person does not cross-link', ({ expect }) => {
    const organization = Organization.make({ name: 'DXOS', website: 'dxos.org' });
    const person = Person.make({ emails: [{ value: 'alice@dxos.org' }], organization: Ref.make(organization) });
    // Specs are per-type: a Person's organization ref never contributes an Organization key.
    expect(personIdentitySpec.keys(person)).toEqual(['email:alice@dxos.org']);
  });
});

describe('IdentityIndex', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Organization.Organization, Person.Person] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  test('resolves a person by any of its emails, however the input is cased', async ({ expect }) => {
    db.add(Person.make({ fullName: 'Alice', emails: [{ value: 'alice@dxos.org' }, { value: 'a@dxos.org' }] }));
    await db.flush({ indexes: true });

    const index = await EffectEx.runPromise(buildIdentityIndex(db, identitySpecs));
    expect(index.lookup(Person.Person, { email: ' A@DXOS.org ' })?.fullName).toBe('Alice');
    expect(index.lookup(Person.Person, { email: 'bob@dxos.org' })).toBeUndefined();
  });

  test('an object registered mid-run resolves before it is committed', async ({ expect }) => {
    const index = await EffectEx.runPromise(buildIdentityIndex(db, identitySpecs));
    // Not added to the database — this is the window in which the old per-run caches forked a duplicate.
    const contact = Person.make({ fullName: 'Alice', emails: [{ value: 'alice@dxos.org' }] });
    index.register(contact);
    expect(index.lookup(Person.Person, { email: 'alice@dxos.org' })?.fullName).toBe('Alice');
  });

  test('the Google resource name of a mail-sourced person resolves to that person', async ({ expect }) => {
    // F2: the contacts sync keys on `resourceName` only; once the key is on the mail-created Person
    // both stages agree, and the second sync updates instead of creating.
    const person = db.add(
      Person.make({
        [Obj.Meta]: { keys: [{ source: GOOGLE, id: 'people/c1' }] },
        fullName: 'Alice',
        emails: [{ value: 'alice@dxos.org' }],
      }),
    );
    await db.flush({ indexes: true });

    const index = await EffectEx.runPromise(buildIdentityIndex(db, identitySpecs));
    expect(index.lookup(Person.Person, { email: 'alice@dxos.org' })?.id).toBe(person.id);
  });

  test('organizations resolve by the domain of a sender email', async ({ expect }) => {
    db.add(Organization.make({ name: 'DXOS', website: 'https://dxos.org' }));
    await db.flush({ indexes: true });

    const index = await EffectEx.runPromise(buildIdentityIndex(db, identitySpecs));
    expect(index.lookup(Organization.Organization, { email: 'alice@dxos.org' })?.name).toBe('DXOS');
  });
});

describe('merge data safety', () => {
  test('a value that cannot be normalized is kept, not dropped', ({ expect }) => {
    // The merge deletes the losers, so anything skipped here is destroyed. `normalizePhone` returns
    // undefined for a value with no digits.
    const objects = [
      Person.make({ id: '01000000000000000000000001', emails: [{ value: 'a@dxos.org' }] }),
      Person.make({
        id: '01000000000000000000000002',
        emails: [{ value: 'a@dxos.org' }],
        phoneNumbers: [{ label: 'ext', value: 'ext. n/a' }, { value: '+1 (415) 555-0100' }],
      }),
    ];

    const [group] = findDuplicates(personIdentitySpec, objects);
    const { preview } = planMerge(personIdentitySpec, group);
    expect(preview.phoneNumbers?.map((phone) => phone.value)).toEqual(['ext. n/a', '+1 (415) 555-0100']);
  });

  test('a trailing + is punctuation, not a country code', ({ expect }) => {
    expect(normalizePhone('+14155550100')).toBe('+14155550100');
    expect(normalizePhone('14155550100+')).toBe('14155550100');
    expect(normalizePhone('(415) 555-0100')).toBe('4155550100');
    expect(normalizePhone('n/a')).toBeUndefined();
  });

  test('addresses key independently of property order', ({ expect }) => {
    const ordered = { street: '1 Main St', locality: 'SF', region: 'CA' };
    const shuffled = { region: 'CA', street: '1 main st ', locality: 'SF' };
    const objects = [
      Person.make({
        id: '01000000000000000000000001',
        emails: [{ value: 'a@dxos.org' }],
        addresses: [{ value: ordered }],
      }),
      Person.make({
        id: '01000000000000000000000002',
        emails: [{ value: 'a@dxos.org' }],
        addresses: [{ value: shuffled }],
      }),
    ];

    const [group] = findDuplicates(personIdentitySpec, objects);
    expect(planMerge(personIdentitySpec, group).preview.addresses).toHaveLength(1);
  });
});
