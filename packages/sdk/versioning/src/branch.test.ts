//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { DXN, Obj, Ref, Type } from '@dxos/echo';
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
});
