//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { DXN, Text as EchoText, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';

import * as Branch from './Branch';
import * as History from './History';

/** Minimal versioned host: a document-like object holding a root Text and a history. */
const TestDoc = Type.makeObject(DXN.make('org.dxos.test.versioning.Doc', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    content: Ref.Ref(Text.Text),
    history: History.History.pipe(Schema.optional),
  }),
);

describe('suggestion branches', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async (content: string) => {
    const { db } = await builder.createDatabase({ types: [TestDoc, Text.Text] });
    const doc = db.add(Obj.make(TestDoc, { content: Ref.make(Text.make({ content })) }));
    await db.flush();
    const root = await doc.content.load();
    return { db, doc, root };
  };

  const activeSuggestions = (doc: any, creator: string) =>
    (doc.history?.branches ?? []).filter(
      (branch: any) => branch.status === 'active' && branch.kind === 'suggestion' && branch.creator === creator,
    );

  test('find-or-create is idempotent per author', async ({ expect }) => {
    const { doc, root } = await setup('one two three');

    const first = await Branch.suggestion(doc, root, 'did:alice');
    expect(first.kind).toBe('suggestion');
    expect(first.creator).toBe('did:alice');

    // Same author reuses the branch; a different author gets its own.
    const again = await Branch.suggestion(doc, root, 'did:alice');
    expect(again.id).toBe(first.id);
    expect(activeSuggestions(doc, 'did:alice')).toHaveLength(1);

    const bob = await Branch.suggestion(doc, root, 'did:bob');
    expect(bob.id).not.toBe(first.id);
    expect(activeSuggestions(doc, 'did:bob')).toHaveLength(1);
  });

  test('archiveIfEmpty archives an unchanged branch but keeps one with edits', async ({ expect }) => {
    const { db, doc, root } = await setup('one two three');

    // A freshly forked suggestion has no changes vs its fork point → archived.
    const empty = await Branch.suggestion(doc, root, 'did:alice');
    expect(await Branch.archiveIfEmpty(doc, empty)).toBe(true);
    expect(doc.history?.branches.find(({ id }) => id === empty.id)?.status).toBe('archived');

    // The next find-or-create makes a fresh branch (the archived one is not active).
    const edited = await Branch.suggestion(doc, root, 'did:alice');
    expect(edited.id).not.toBe(empty.id);

    const binding = await Branch.bind(doc, edited);
    Obj.update(binding.object, (text) => {
      text.content = 'one two three four';
    });
    await db.flush();
    binding.dispose();

    expect(await Branch.archiveIfEmpty(doc, edited)).toBe(false);
    expect(doc.history?.branches.find(({ id }) => id === edited.id)?.status).toBe('active');
  });

  test('find-or-create reconciles a stale branch by folding main in, keeping its identity', async ({ expect }) => {
    const { db, doc, root } = await setup('one two three');

    const branch = await Branch.suggestion(doc, root, 'did:alice');
    // Main advances after the fork; the branch has no edits of its own.
    Obj.update(root, (root) => {
      EchoText.update(root, 'content', 'one two three four');
    });
    await db.flush();

    // Re-entry folds main into the SAME branch (callers hold the branch identity), so text typed on
    // main in between never diffs as the author's deletion.
    const synced = await Branch.suggestion(doc, root, 'did:alice');
    expect(synced.id).toBe(branch.id);
    expect(activeSuggestions(doc, 'did:alice')).toHaveLength(1);
    const binding = await Branch.bind(doc, synced);
    try {
      expect(binding.object.content).toBe('one two three four');
    } finally {
      binding.dispose();
    }

    // An EDITED branch reconciles the same way: pending suggestions AND main's progress both survive.
    const editedBinding = await Branch.bind(doc, synced);
    Obj.update(editedBinding.object, (text) => {
      EchoText.update(text, 'content', 'one two three four five');
    });
    await db.flush();
    editedBinding.dispose();
    Obj.update(root, (root) => {
      EchoText.update(root, 'content', 'one two three four six');
    });
    await db.flush();
    const kept = await Branch.suggestion(doc, root, 'did:alice');
    expect(kept.id).toBe(synced.id);
    const keptBinding = await Branch.bind(doc, kept);
    try {
      expect(keptBinding.object.content).toContain('five');
      expect(keptBinding.object.content).toContain('six');
    } finally {
      keptBinding.dispose();
    }
  });
});
