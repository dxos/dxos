//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Ref } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { Text } from '@dxos/schema';
import { Event } from '@dxos/types';

import { SHADOW_KEY_SOURCE, findShadowObject, reanchorShadowObject } from './shadow';

describe('shadow', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Event.Event, Text.Text] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const addEvent = (title: string): Event.Event =>
    db.add(
      Event.make({ owner: {}, title, startDate: '2026-06-08T09:00:00.000Z', endDate: '2026-06-08T10:00:00.000Z' }),
    );

  test('finds and re-anchors a shadow (with notes) from a draft to its synced copy', async ({ expect }) => {
    const draft = addEvent('Draft');
    const synced = addEvent('Synced');
    const draftUri = Obj.getURI(draft);
    const syncedUri = Obj.getURI(synced);

    // Shadow annotating the draft, carrying a notes ref (as `handleNoteCreate` would produce).
    const notes = db.add(Text.make());
    const shadow = db.add(Obj.clone(draft));
    Obj.update(shadow, (shadow) => {
      Obj.getMeta(shadow).keys.push({ source: SHADOW_KEY_SOURCE, id: draftUri });
      shadow.notes = Ref.make(notes);
    });
    await db.flush();

    const before = await db.query(Filter.type(Event.Event)).run();
    expect(findShadowObject(before, draftUri)?.id).toBe(shadow.id);
    expect(findShadowObject(before, syncedUri)).toBeUndefined();

    reanchorShadowObject(shadow, draftUri, syncedUri);
    await db.flush();

    const after = await db.query(Filter.type(Event.Event)).run();
    // Now resolves for the synced copy, not the (deleted) draft.
    expect(findShadowObject(after, draftUri)).toBeUndefined();
    expect(findShadowObject(after, syncedUri)?.id).toBe(shadow.id);
    // Notes survive the re-anchor.
    expect(shadow.notes?.target?.id).toBe(notes.id);
  });
});
