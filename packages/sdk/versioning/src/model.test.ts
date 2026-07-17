//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { DXN, Text as EchoText, Entity, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';

import * as Branch from './Branch';
import * as History from './History';
import * as Version from './Version';

/** Minimal versioned host: a document-like object holding a root Text and a history. */
const TestDoc = Type.makeObject(DXN.make('org.dxos.test.versioning.Doc', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    content: Ref.Ref(Text.Text),
    history: History.History.pipe(Schema.optional),
  }),
);

describe('versioning model', () => {
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

  test('ensureHistory initializes once', async ({ expect }) => {
    const { doc } = await setup('one');
    const history = History.ensure(doc);
    expect(history.versions).toEqual([]);
    expect(History.ensure(doc)).toBe(doc.history);
  });

  test('checkpoint records current heads; contentAt returns historical content', async ({ expect }) => {
    const { doc, root } = await setup('one');

    const checkpoint = Version.create(doc, { name: 'v1', target: root });
    expect(checkpoint.heads.length).toBeGreaterThan(0);
    expect(doc.history?.versions).toHaveLength(1);

    Obj.update(root, (root) => {
      root.content = 'one two';
    });

    expect(Version.contentAt(root, checkpoint.heads)).toBe('one');
    expect(root.content).toBe('one two');
  });

  test('core branch forks at anchor; binding edits stay isolated from the parent', async ({ expect }) => {
    const { db, doc, root } = await setup('one two three');

    const branch = await Branch.create(doc, { name: 'draft', parent: root });
    expect(Branch.isCore(branch)).toBe(true);
    // The record keys the space-root registry; no separate Text object is created.
    expect(branch.content).toBeUndefined();
    expect(db.listBranches(root.id)).toContain(branch.key);
    // Fork point auto-checkpointed on the parent.
    expect(doc.history?.versions.some((version) => version.name === 'fork: draft')).toBe(true);

    const binding = await Branch.bind(doc, branch);
    expect(binding.object.content).toBe('one two three');
    Obj.update(binding.object, (text) => {
      text.content = 'one two three four';
    });
    await db.flush();
    expect(binding.object.content).toBe('one two three four');
    expect(root.content).toBe('one two three');
    binding.dispose();
  });

  test('branch at a historical checkpoint seeds historical content', async ({ expect }) => {
    const { doc, root } = await setup('first');
    const checkpoint = Version.create(doc, { name: 'v1', target: root });

    Obj.update(root, (root) => {
      root.content = 'second';
    });

    const branch = await Branch.create(doc, { name: 'from-v1', parent: root, heads: checkpoint.heads });
    const binding = await Branch.bind(doc, branch);
    expect(binding.object.content).toBe('first');
    binding.dispose();
  });

  test('CRDT merge folds branch edits into the parent; concurrent edits both survive', async ({ expect }) => {
    const { db, doc, root } = await setup('alpha\nbravo\n');

    const branch = await Branch.create(doc, { name: 'draft', parent: root });
    const binding = await Branch.bind(doc, branch);
    // Splice-based edits (what the editor produces) merge character-level across branches;
    // whole-string assignment would be a scalar PUT that merges last-writer-wins.
    Obj.update(binding.object, () => {
      EchoText.update(binding.object, 'content', 'alpha\nbravo\ncharlie\n');
    });
    // Concurrent parent edit after the fork.
    Obj.update(root, () => {
      EchoText.update(root, 'content', 'alpha edited\nbravo\n');
    });
    await db.flush();
    binding.dispose();

    const result = await Branch.merge(doc, branch);
    expect(result.conflicts).toBe(0);
    expect(root.content).toBe('alpha edited\nbravo\ncharlie\n');
    expect(branch.status).toBe('merged');
    expect(doc.history?.versions.some((version) => version.name === 'merge: draft')).toBe(true);
    // The registry entry is removed after a CRDT merge.
    expect(db.listBranches(root.id)).not.toContain(branch.key);
  });

  test('concurrent same-line edits merge via the CRDT — no conflict markers', async ({ expect }) => {
    const { db, doc, root } = await setup('alpha\nbravo\n');

    const branch = await Branch.create(doc, { name: 'draft', parent: root });
    const binding = await Branch.bind(doc, branch);
    Obj.update(binding.object, () => {
      EchoText.update(binding.object, 'content', 'alpha theirs\nbravo\n');
    });
    Obj.update(root, () => {
      EchoText.update(root, 'content', 'alpha ours\nbravo\n');
    });
    await db.flush();
    binding.dispose();

    const result = await Branch.merge(doc, branch);
    expect(result.conflicts).toBe(0);
    expect(root.content).not.toContain('<<<<<<<');
    expect(root.content).toContain('bravo');
    expect(branch.status).toBe('merged');
  });

  test('legacy content-copy branch merges textually with conflict markers', async ({ expect }) => {
    const { db, doc, root } = await setup('alpha\nbravo\n');

    // Simulate a pre-core (content-copy) branch record: a separate Text seeded from the parent.
    const anchor = [...(Obj.version(root).automergeHeads ?? [])];
    const branchText = db.add(Text.make({ content: root.content }));
    const legacy = Branch.make({
      name: 'legacy',
      content: Ref.make(branchText),
      parent: Ref.make(root),
      anchor,
    });
    const history = History.ensure(doc);
    Obj.update(doc, () => {
      history.branches.push(legacy);
    });
    const stored = history.branches.find(({ id }) => id === legacy.id)!;
    expect(Branch.isCore(stored)).toBe(false);

    Obj.update(branchText, (branchText) => {
      branchText.content = 'alpha theirs\nbravo\n';
    });
    Obj.update(root, (root) => {
      root.content = 'alpha ours\nbravo\n';
    });

    const result = await Branch.merge(doc, stored);
    expect(result.conflicts).toBe(1);
    expect(root.content).toContain('<<<<<<< branch');
    expect(root.content).toContain('alpha theirs');
    expect(root.content).toContain('alpha ours');
    expect(stored.status).toBe('merged');
  });

  test('view pins reads to the checkpoint; clearView returns live', async ({ expect }) => {
    const { doc, root } = await setup('first');
    const checkpoint = Version.create(doc, { name: 'v1', target: root });

    Obj.update(root, (root) => {
      root.content = 'second';
    });

    Version.view(checkpoint);
    expect(root.content).toBe('first');
    expect(Entity.isTimeTraveling(root)).toBe(true);
    // Writes throw while pinned.
    expect(() =>
      Obj.update(root, (root) => {
        root.content = 'nope';
      }),
    ).toThrow();

    Version.clearView(checkpoint);
    expect(root.content).toBe('second');
    expect(Entity.isTimeTraveling(root)).toBe(false);
  });

  test('restore applies historical content as a new forward edit', async ({ expect }) => {
    const { doc, root } = await setup('first');
    const checkpoint = Version.create(doc, { name: 'v1', target: root });

    Obj.update(root, (root) => {
      root.content = 'second';
    });

    Version.restore(doc, checkpoint);
    expect(root.content).toBe('first');
    // History retained: heads advanced, not rewound.
    expect(Obj.version(root).automergeHeads).not.toEqual(checkpoint.heads);
  });

  test('restore while viewing a checkpoint clears the pin first', async ({ expect }) => {
    const { doc, root } = await setup('first');
    const checkpoint = Version.create(doc, { name: 'v1', target: root });

    Obj.update(root, (root) => {
      root.content = 'second';
    });

    // Viewing the checkpoint pins reads; restore must transition back to live before writing.
    Version.view(checkpoint);
    expect(root.content).toBe('first');
    Version.restore(doc, checkpoint);
    expect(Entity.isTimeTraveling(root)).toBe(false);
    expect(root.content).toBe('first');
    // The restored state is a forward edit on the live tip; editing continues normally.
    Obj.update(root, (root) => {
      root.content = 'third';
    });
    expect(root.content).toBe('third');
  });

  test('discard archives without touching the parent; the branch stays recoverable', async ({ expect }) => {
    const { db, doc, root } = await setup('one');

    const branch = await Branch.create(doc, { name: 'draft', parent: root });
    Branch.discard(doc, branch);

    expect(branch.status).toBe('archived');
    expect(root.content).toBe('one');
    // The registry entry (and hence the branch doc) is retained for recovery until stage-4 cleanup.
    expect(db.listBranches(root.id)).toContain(branch.key);
  });
});
