//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { SpaceProperties } from '@dxos/client-protocol';
import { Collection, Database, Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { Text } from '@dxos/schema';
import { HasSubject } from '@dxos/types';
import {
  contentAt,
  createBranch,
  createCheckpoint,
  discardBranch,
  ensureHistory,
  mergeBranch,
  restore,
} from '@dxos/versioning';

import { WithProperties } from '#testing';

import { MarkdownOperationHandlerSet } from '../operations';
import { Markdown } from '../types';

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: MarkdownOperationHandlerSet,
  types: [SpaceProperties, Collection.Collection, Markdown.Document, Text.Text, HasSubject.HasSubject, Feed.Feed],
});

describe('versioning model', () => {
  it.effect(
    'ensureHistory initializes once',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Doc', content: 'one' });
        yield* Database.add(doc);

        const history = ensureHistory(doc);
        expect(history.versions).toEqual([]);
        expect(ensureHistory(doc)).toBe(doc.history);
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'createCheckpoint records current heads; contentAt returns historical content',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Doc', content: 'one' });
        yield* Database.add(doc);
        const text = yield* Database.load(doc.content);

        const checkpoint = createCheckpoint(doc, { name: 'v1', target: text });
        expect(checkpoint.heads.length).toBeGreaterThan(0);
        expect(doc.history?.versions).toHaveLength(1);

        Obj.update(text, (text) => {
          text.content = 'one two';
        });

        expect(contentAt(text, checkpoint.heads)).toBe('one');
        expect(text.content).toBe('one two');
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'createBranch forks content at anchor; edits stay isolated',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Doc', content: 'one two three' });
        yield* Database.add(doc);
        const root = yield* Database.load(doc.content);

        const branch = createBranch(doc, { name: 'draft', parent: root });
        const branchText = yield* Database.load(branch.content);
        expect(branchText.content).toBe('one two three');
        expect(doc.history?.versions.some((version) => version.name === 'fork: draft')).toBe(true);

        Obj.update(branchText, (branchText) => {
          branchText.content = 'one two three four';
        });
        expect(root.content).toBe('one two three');
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'createBranch at a historical checkpoint seeds historical content',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Doc', content: 'first' });
        yield* Database.add(doc);
        const root = yield* Database.load(doc.content);
        const checkpoint = createCheckpoint(doc, { name: 'v1', target: root });

        Obj.update(root, (root) => {
          root.content = 'second';
        });

        const branch = createBranch(doc, { name: 'from-v1', parent: root, heads: checkpoint.heads });
        const branchText = yield* Database.load(branch.content);
        expect(branchText.content).toBe('first');
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'mergeBranch applies branch changes to parent as one edit',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Doc', content: 'alpha\nbravo\n' });
        yield* Database.add(doc);
        const root = yield* Database.load(doc.content);

        const branch = createBranch(doc, { name: 'draft', parent: root });
        const branchText = yield* Database.load(branch.content);
        Obj.update(branchText, (branchText) => {
          branchText.content = 'alpha\nbravo\ncharlie\n';
        });
        // Concurrent parent edit after the fork.
        Obj.update(root, (root) => {
          root.content = 'alpha edited\nbravo\n';
        });

        const result = mergeBranch(doc, branch);
        expect(result.conflicts).toBe(0);
        expect(root.content).toBe('alpha edited\nbravo\ncharlie\n');
        expect(branch.status).toBe('merged');
        expect(doc.history?.versions.some((version) => version.name === 'merge: draft')).toBe(true);
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'restore applies historical content as a new forward edit',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Doc', content: 'first' });
        yield* Database.add(doc);
        const root = yield* Database.load(doc.content);
        const checkpoint = createCheckpoint(doc, { name: 'v1', target: root });

        Obj.update(root, (root) => {
          root.content = 'second';
        });

        restore(doc, checkpoint);
        expect(root.content).toBe('first');
        // History retained: heads advanced, not rewound.
        expect(Obj.version(root).automergeHeads).not.toEqual(checkpoint.heads);
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'mergeBranch leaves conflict markers when both sides edit the same line',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Doc', content: 'alpha\nbravo\n' });
        yield* Database.add(doc);
        const root = yield* Database.load(doc.content);

        const branch = createBranch(doc, { name: 'draft', parent: root });
        const branchText = yield* Database.load(branch.content);
        Obj.update(branchText, (branchText) => {
          branchText.content = 'alpha theirs\nbravo\n';
        });
        Obj.update(root, (root) => {
          root.content = 'alpha ours\nbravo\n';
        });

        const result = mergeBranch(doc, branch);
        expect(result.conflicts).toBe(1);
        expect(root.content).toContain('<<<<<<< branch');
        expect(root.content).toContain('alpha theirs');
        expect(root.content).toContain('alpha ours');
        expect(branch.status).toBe('merged');
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'branch of a branch forks from and merges into its parent branch',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Doc', content: 'alpha\n' });
        yield* Database.add(doc);
        const root = yield* Database.load(doc.content);

        const parentBranch = createBranch(doc, { name: 'draft', parent: root });
        const parentText = yield* Database.load(parentBranch.content);
        Obj.update(parentText, (parentText) => {
          parentText.content = 'alpha\nbravo\n';
        });

        const childBranch = createBranch(doc, { name: 'nested', parent: parentText });
        const childText = yield* Database.load(childBranch.content);
        expect(childText.content).toBe('alpha\nbravo\n');

        Obj.update(childText, (childText) => {
          childText.content = 'alpha\nbravo\ncharlie\n';
        });

        // Merging the child lands on the parent BRANCH, not the root.
        const result = mergeBranch(doc, childBranch);
        expect(result.conflicts).toBe(0);
        expect(parentText.content).toBe('alpha\nbravo\ncharlie\n');
        expect(root.content).toBe('alpha\n');
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'discardBranch archives without touching parent',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Doc', content: 'one' });
        yield* Database.add(doc);
        const root = yield* Database.load(doc.content);

        const branch = createBranch(doc, { name: 'draft', parent: root });
        yield* Database.load(branch.content);
        discardBranch(doc, branch);

        expect(branch.status).toBe('archived');
        expect(root.content).toBe('one');
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
