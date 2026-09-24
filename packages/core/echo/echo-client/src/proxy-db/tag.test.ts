//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Tag } from '@dxos/echo';

import { EchoTestBuilder } from '../testing/index.ts';

describe('Tag.findOrCreate', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('finds-or-creates a user tag by case-insensitive label', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Tag.Tag] });

    const created = await Tag.findOrCreate(db, { label: 'Starred', hue: 'yellow' });
    expect(created.label).toBe('Starred');
    expect(created.hue).toBe('yellow');

    const again = await Tag.findOrCreate(db, { label: 'starred' });
    expect(again.id).toBe(created.id);
    expect((await db.query(Filter.type(Tag.Tag)).run()).length).toBe(1);
  });

  test('finds-or-creates by foreign key and keeps the label current', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Tag.Tag] });
    const key = { source: 'google.com/gmail/label', id: 'Label_42' };

    const created = await Tag.findOrCreate(db, { key, label: 'Work' });
    expect(Obj.getKeys(created, key.source)).toEqual([key]);

    // Re-sync with a renamed label reuses the same Tag and updates its label.
    const renamed = await Tag.findOrCreate(db, { key, label: 'Work (renamed)' });
    expect(renamed.id).toBe(created.id);
    expect(renamed.label).toBe('Work (renamed)');
    expect((await db.query(Filter.type(Tag.Tag)).run()).length).toBe(1);
  });

  test('label lookup ignores keyed (system/provider) tags', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Tag.Tag] });
    const key = { source: 'google.com/gmail/label', id: 'Label_99' };

    const keyed = await Tag.findOrCreate(db, { key, label: 'Important' });
    // A user tag with the same label is a distinct object (keyed tag is not matched by label).
    const user = await Tag.findOrCreate(db, { label: 'Important' });
    expect(user.id).not.toBe(keyed.id);
    expect((await db.query(Filter.type(Tag.Tag)).run()).length).toBe(2);
  });
  test('a legacy key is adopted, so a renamed key source keeps the same Tag', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Tag.Tag] });
    const legacyKey = { source: 'com.google.gmail.label', id: 'Label_7' };
    const key = { source: 'com.google.gmail', id: 'Label_7' };

    const before = await Tag.findOrCreate(db, { key: legacyKey, label: 'Receipts' });

    // The rename: same tag, key rewritten in place, no parallel tag created.
    const after = await Tag.findOrCreate(db, { key, label: 'Receipts', legacyKeys: [legacyKey] });
    expect(after.id).toBe(before.id);
    expect(Obj.getKeys(after, key.source)).toEqual([key]);
    expect(Obj.getKeys(after, legacyKey.source)).toEqual([]);
    expect((await db.query(Filter.type(Tag.Tag)).run()).length).toBe(1);

    // Idempotent: the next sync matches the new key directly and the legacy lookup is a no-op.
    const again = await Tag.findOrCreate(db, { key, label: 'Receipts', legacyKeys: [legacyKey] });
    expect(again.id).toBe(before.id);
    expect((await db.query(Filter.type(Tag.Tag)).run()).length).toBe(1);
  });

  test('without legacyKeys a renamed source creates a parallel tag (the hazard being avoided)', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Tag.Tag] });
    const legacyKey = { source: 'com.google.gmail.label', id: 'Label_8' };

    const before = await Tag.findOrCreate(db, { key: legacyKey, label: 'Travel' });
    const after = await Tag.findOrCreate(db, { key: { source: 'com.google.gmail', id: 'Label_8' }, label: 'Travel' });
    expect(after.id).not.toBe(before.id);
    expect((await db.query(Filter.type(Tag.Tag)).run()).length).toBe(2);
  });
});

describe('Tag origin', () => {
  test('classifies user, canonical and provider tags', ({ expect }) => {
    const user = Tag.make({ label: 'Reading' });
    const canonical = Obj.make(Tag.Tag, {
      [Obj.Meta]: { keys: [{ source: Tag.CANONICAL_ORIGIN, id: 'starred' }] },
      label: 'Starred',
    });
    const provider = Obj.make(Tag.Tag, {
      [Obj.Meta]: { keys: [{ source: 'com.google.gmail', id: 'Label_1' }] },
      label: 'Work',
    });

    expect(Tag.getOrigin(user)).toBeUndefined();
    expect(Tag.getOrigin(canonical)).toBe(Tag.CANONICAL_ORIGIN);
    expect(Tag.getOrigin(provider)).toBe('com.google.gmail');

    expect(Tag.isUserTag(user)).toBe(true);
    expect(Tag.isUserTag(canonical)).toBe(false);
    expect(Tag.isUserTag(provider)).toBe(false);

    // Canonical tags stay locally toggleable; only foreign providers own membership.
    expect(Tag.isProviderTag(user)).toBe(false);
    expect(Tag.isProviderTag(canonical)).toBe(false);
    expect(Tag.isProviderTag(provider)).toBe(true);
  });
});
