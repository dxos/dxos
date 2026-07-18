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

  test('branch forks content at anchor; edits stay isolated', async ({ expect }) => {
    const { doc, root } = await setup('one two three');

    const branch = Branch.create(doc, { name: 'draft', parent: root });
    const branchText = await branch.content.load();
    expect(branchText.content).toBe('one two three');
    // Fork point auto-checkpointed on the parent.
    expect(doc.history?.versions.some((version) => version.name === 'fork: draft')).toBe(true);

    Obj.update(branchText, (branchText) => {
      branchText.content = 'one two three four';
    });
    expect(root.content).toBe('one two three');
  });

  test('branch at a historical checkpoint seeds historical content', async ({ expect }) => {
    const { doc, root } = await setup('first');
    const checkpoint = Version.create(doc, { name: 'v1', target: root });

    Obj.update(root, (root) => {
      root.content = 'second';
    });

    const branch = Branch.create(doc, { name: 'from-v1', parent: root, heads: checkpoint.heads });
    const branchText = await branch.content.load();
    expect(branchText.content).toBe('first');
  });

  test('merge applies branch changes to parent as one edit', async ({ expect }) => {
    const { doc, root } = await setup('alpha\nbravo\n');

    const branch = Branch.create(doc, { name: 'draft', parent: root });
    const branchText = await branch.content.load();
    Obj.update(branchText, (branchText) => {
      branchText.content = 'alpha\nbravo\ncharlie\n';
    });
    // Concurrent parent edit after the fork.
    Obj.update(root, (root) => {
      root.content = 'alpha edited\nbravo\n';
    });

    const result = Branch.merge(doc, branch);
    expect(result.conflicts).toBe(0);
    expect(root.content).toBe('alpha edited\nbravo\ncharlie\n');
    expect(branch.status).toBe('merged');
    expect(doc.history?.versions.some((version) => version.name === 'merge: draft')).toBe(true);
  });

  test('merge leaves conflict markers when both sides edit the same line', async ({ expect }) => {
    const { doc, root } = await setup('alpha\nbravo\n');

    const branch = Branch.create(doc, { name: 'draft', parent: root });
    const branchText = await branch.content.load();
    Obj.update(branchText, (branchText) => {
      branchText.content = 'alpha theirs\nbravo\n';
    });
    Obj.update(root, (root) => {
      root.content = 'alpha ours\nbravo\n';
    });

    const result = Branch.merge(doc, branch);
    expect(result.conflicts).toBe(1);
    expect(root.content).toContain('<<<<<<< branch');
    expect(root.content).toContain('alpha theirs');
    expect(root.content).toContain('alpha ours');
    expect(branch.status).toBe('merged');
  });

  test('branch of a branch forks from and merges into its parent branch', async ({ expect }) => {
    const { doc, root } = await setup('alpha\n');

    const parentBranch = Branch.create(doc, { name: 'draft', parent: root });
    const parentText = await parentBranch.content.load();
    Obj.update(parentText, (parentText) => {
      parentText.content = 'alpha\nbravo\n';
    });

    const childBranch = Branch.create(doc, { name: 'nested', parent: parentText });
    const childText = await childBranch.content.load();
    expect(childText.content).toBe('alpha\nbravo\n');

    Obj.update(childText, (childText) => {
      childText.content = 'alpha\nbravo\ncharlie\n';
    });

    // Merging the child lands on the parent BRANCH, not the root.
    const result = Branch.merge(doc, childBranch);
    expect(result.conflicts).toBe(0);
    expect(parentText.content).toBe('alpha\nbravo\ncharlie\n');
    expect(root.content).toBe('alpha\n');
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

  test('discard archives without touching parent', async ({ expect }) => {
    const { doc, root } = await setup('one');

    const branch = Branch.create(doc, { name: 'draft', parent: root });
    await branch.content.load();
    Branch.discard(doc, branch);

    expect(branch.status).toBe('archived');
    expect(root.content).toBe('one');
  });
});
