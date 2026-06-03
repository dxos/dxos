//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Tag } from '@dxos/echo';

import { EchoTestBuilder } from '../testing';

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
});
