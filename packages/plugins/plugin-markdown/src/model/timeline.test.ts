//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import { Collection, Database, Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { Text } from '@dxos/schema';
import { HasSubject } from '@dxos/types';
import { Branch, Version } from '@dxos/versioning';

import { WithProperties } from '#testing';

import { MarkdownOperationHandlerSet } from '../operations';
import { Markdown } from '../types';
import { MAIN_BRANCH, NOW_COMMIT_ID, commitToSelection, createTimelineModel } from './timeline';

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: MarkdownOperationHandlerSet,
  types: [SpaceProperties, Collection.Collection, Markdown.Document, Text.Text, HasSubject.HasSubject, Feed.Feed],
});

describe('timeline model', () => {
  it.effect(
    'maps checkpoints, forks, and merges onto topologically ordered commits',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Doc', content: 'alpha\n' });
        yield* Database.add(doc);
        const root = yield* Database.load(doc.content);

        const v1 = Version.create(doc, { name: 'v1', target: root });
        const branch = Branch.create(doc, { name: 'draft', parent: root });
        const branchText = yield* Database.load(branch.content);
        Obj.update(branchText, (branchText) => {
          branchText.content = 'alpha\nbravo\n';
        });
        Branch.merge(doc, branch);
        Obj.update(root, (root) => {
          root.content = 'alpha\nbravo\ncharlie\n';
        });
        Version.create(doc, { name: 'v2', target: root });

        const { commits, branches } = createTimelineModel(doc);

        expect(branches[0]).toBe(MAIN_BRANCH);
        expect(branches).toContain('draft');

        // Parents always precede children (the Timeline contract).
        const indexOf = new Map(commits.map((commit, index) => [commit.id, index]));
        for (const commit of commits) {
          for (const parent of commit.parents ?? []) {
            const parentIndex = indexOf.get(parent);
            invariant(parentIndex !== undefined);
            expect(parentIndex).toBeLessThan(indexOf.get(commit.id) ?? -1);
          }
        }

        // The merge commit joins the branch tip and the previous main commit.
        const merge = commits.find((commit) => commit.message === 'merge: draft');
        invariant(merge);
        expect(merge.branch).toBe(MAIN_BRANCH);
        expect(merge.parents).toHaveLength(2);
        expect(merge.parents).toContain(`branch-${branch.id}`);

        // Synthetic editable tip terminates main.
        const last = commits[commits.length - 1];
        expect(last.id).toBe(NOW_COMMIT_ID);
        expect(last.branch).toBe(MAIN_BRANCH);

        // Selection round-trip.
        expect(commitToSelection(doc, last)).toEqual({ kind: 'current' });
        const v1Commit = commits.find((commit) => commit.id === v1.id);
        invariant(v1Commit);
        expect(commitToSelection(doc, v1Commit)).toEqual({ kind: 'checkpoint', versionId: v1.id });
        // The merged branch is no longer an editable target.
        const branchCommit = commits.find((commit) => commit.id === `branch-${branch.id}`);
        invariant(branchCommit);
        expect(commitToSelection(doc, branchCommit)).toEqual({ kind: 'current' });
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'active branch commit selects the branch and carries diff stats',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Doc', content: 'alpha\n' });
        yield* Database.add(doc);
        const root = yield* Database.load(doc.content);

        const branch = Branch.create(doc, { name: 'draft', parent: root });
        const branchText = yield* Database.load(branch.content);
        Obj.update(branchText, (branchText) => {
          branchText.content = 'alpha\nbravo\n';
        });

        const { commits } = createTimelineModel(doc);
        const branchCommit = commits.find((commit) => commit.id === `branch-${branch.id}`);
        invariant(branchCommit);
        expect(branchCommit.message).toContain('draft');
        expect(branchCommit.message).toContain('+6');
        expect(commitToSelection(doc, branchCommit)).toEqual({ kind: 'branch', branchId: branch.id });
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
