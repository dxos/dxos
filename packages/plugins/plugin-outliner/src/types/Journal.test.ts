//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { Text } from '@dxos/schema';

import { addBullet, getOrCreateEntry, Journal, JournalEntry, make, makeEntry } from './Journal';
import { getDateString } from './util';

describe('Journal', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    const result = await builder.createDatabase({ types: [Journal, JournalEntry, Text.Text] });
    db = result.db;
  });

  afterEach(async () => {
    await builder.close();
  });

  describe('addBullet', () => {
    test('appends bullet to empty entry', async ({ expect }) => {
      const entry = db.add(makeEntry());
      await db.flush();

      await addBullet(entry, 'Buy groceries');

      const textObj = await entry.content.load();
      expect(textObj.content).toBe('- [ ] Buy groceries');
    });

    test('appends bullet to entry with existing content', async ({ expect }) => {
      const entry = db.add(makeEntry());
      await db.flush();

      await addBullet(entry, 'First item');
      await addBullet(entry, 'Second item');

      const textObj = await entry.content.load();
      expect(textObj.content).toBe('- [ ] First item\n- [ ] Second item');
    });

    test('trims whitespace from text', async ({ expect }) => {
      const entry = db.add(makeEntry());
      await db.flush();

      await addBullet(entry, '  padded text  ');

      const textObj = await entry.content.load();
      expect(textObj.content).toBe('- [ ] padded text');
    });

    test('collapses newlines in text', async ({ expect }) => {
      const entry = db.add(makeEntry());
      await db.flush();

      await addBullet(entry, 'line one\n\nline two');

      const textObj = await entry.content.load();
      expect(textObj.content).toBe('- [ ] line one line two');
    });
  });

  describe('getOrCreateEntry', () => {
    test('creates entry when journal has no entry for date', async ({ expect }) => {
      const journal = db.add(Obj.make(Journal, { entries: {} }));
      await db.flush();

      const entry = await getOrCreateEntry(journal, db);

      expect(entry).toBeDefined();
      expect(entry.date).toBe(getDateString(new Date()));
    });

    test('returns existing entry for today', async ({ expect }) => {
      const journal = db.add(make());
      await db.flush();

      const entry = await getOrCreateEntry(journal, db);
      await addBullet(entry, 'test bullet');

      const sameEntry = await getOrCreateEntry(journal, db);
      expect(sameEntry.id).toBe(entry.id);

      const textObj = await sameEntry.content.load();
      expect(textObj.content).toContain('test bullet');
    });

    test('does not overwrite existing entry content', async ({ expect }) => {
      const journal = db.add(make());
      await db.flush();

      const entry = await getOrCreateEntry(journal, db);
      await addBullet(entry, 'existing content');

      // Simulate a second quick entry — should append, not overwrite.
      const sameEntry = await getOrCreateEntry(journal, db);
      await addBullet(sameEntry, 'new content');

      const textObj = await sameEntry.content.load();
      expect(textObj.content).toBe('- [ ] existing content\n- [ ] new content');
    });

    test('creates separate entries for different dates', async ({ expect }) => {
      const journal = db.add(Obj.make(Journal, { entries: {} }));
      await db.flush();

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const todayEntry = await getOrCreateEntry(journal, db, today);
      const yesterdayEntry = await getOrCreateEntry(journal, db, yesterday);

      expect(todayEntry.id).not.toBe(yesterdayEntry.id);
      expect(todayEntry.date).toBe(getDateString(today));
      expect(yesterdayEntry.date).toBe(getDateString(yesterday));
    });
  });
});
