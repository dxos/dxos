//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { DXN, Filter, Obj, Type } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';

import { SHADOW_KEY_SOURCE, findShadowObject, reanchorShadowObject } from './shadow';

// Minimal writable type to exercise the shadow helpers without depending on a specific app schema.
const Note = Type.makeObject(DXN.make('example.org.test.note', '0.1.0'))(
  Schema.Struct({
    id: Obj.ID,
    value: Schema.optional(Schema.String),
  }),
);

describe('shadow', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Note] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const addNote = (value: string): Type.InstanceType<typeof Note> => db.add(Obj.make(Note, { value }));

  test('finds and re-anchors a shadow from a draft to its synced copy', async ({ expect }) => {
    const draft = addNote('Draft');
    const synced = addNote('Synced');
    const draftUri = Obj.getURI(draft);
    const syncedUri = Obj.getURI(synced);

    // Shadow annotating the draft, carrying a mutable field (as the shadow hook would produce).
    const shadow = db.add(Obj.clone(draft));
    Obj.update(shadow, (shadow) => {
      Obj.getMeta(shadow).keys.push({ source: SHADOW_KEY_SOURCE, id: draftUri });
      shadow.value = 'Annotation';
    });
    await db.flush();

    const before = await db.query(Filter.type(Note)).run();
    expect(findShadowObject(before, draftUri)?.id).toBe(shadow.id);
    expect(findShadowObject(before, syncedUri)).toBeUndefined();

    reanchorShadowObject(shadow, draftUri, syncedUri);
    await db.flush();

    const after = await db.query(Filter.type(Note)).run();
    // Now resolves for the synced copy, not the (deleted) draft.
    expect(findShadowObject(after, draftUri)).toBeUndefined();
    expect(findShadowObject(after, syncedUri)?.id).toBe(shadow.id);
    // The annotation survives the re-anchor.
    expect(shadow.value).toBe('Annotation');
  });
});
