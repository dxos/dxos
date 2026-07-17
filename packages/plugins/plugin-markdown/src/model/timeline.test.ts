//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import { Collection, Database, Text as EchoText, Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { MAIN_BRANCH, NOW_COMMIT_ID, commitToSelection, createTimelineModel } from '@dxos/plugin-space';
import { Text } from '@dxos/schema';
import { HasSubject } from '@dxos/types';
import { Branch, Version } from '@dxos/versioning';

import { WithProperties } from '#testing';

import { MarkdownOperationHandlerSet } from '../operations';
import { Markdown } from '../types';

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
        const branch = yield* Effect.promise(() => Branch.create(doc, { name: 'draft', parent: root }));
        const binding = yield* Effect.promise(() => Branch.bind(doc, branch));
        Obj.update(binding.object, () => {
          EchoText.update(binding.object, 'content', 'alpha\nbravo\n');
        });
        yield* Effect.promise(() => Branch.merge(doc, branch));
        binding.dispose();
        Obj.update(root, (root) => {
          root.content = 'alpha\nbravo\ncharlie\n';
        });
        Version.create(doc, { name: 'v2', target: root });

        const { commits, branches } = createTimelineModel(doc, root);

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
    'active branch commit selects the branch',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Doc', content: 'alpha\n' });
        yield* Database.add(doc);
        const root = yield* Database.load(doc.content);

        const branch = yield* Effect.promise(() => Branch.create(doc, { name: 'draft', parent: root }));
        const binding = yield* Effect.promise(() => Branch.bind(doc, branch));
        Obj.update(binding.object, () => {
          EchoText.update(binding.object, 'content', 'alpha\nbravo\n');
        });
        binding.dispose();

        const { commits } = createTimelineModel(doc, root);
        const branchCommit = commits.find((commit) => commit.id === `branch-${branch.id}`);
        invariant(branchCommit);
        // Core branches carry no synchronous diff stats (needs a binding; stage-3 timeline work).
        expect(branchCommit.message).toContain('draft');
        expect(commitToSelection(doc, branchCommit)).toEqual({ kind: 'branch', branchId: branch.id });
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a checkpoint taken on a core branch lands on the branch lane, not the parent',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Doc', content: 'alpha\n' });
        yield* Database.add(doc);
        const root = yield* Database.load(doc.content);

        // A checkpoint on main, then a branch, then a checkpoint taken ON the branch.
        Version.create(doc, { name: 'on-main', target: root });
        const branch = yield* Effect.promise(() => Branch.create(doc, { name: 'draft', parent: root }));
        const binding = yield* Effect.promise(() => Branch.bind(doc, branch));
        Obj.update(binding.object, () => {
          EchoText.update(binding.object, 'content', 'alpha\nbravo\n');
        });
        // Checkpoint the branch-bound Text, tagged with the branch key (what ObjectHistory does).
        const branchCheckpoint = Version.create(doc, {
          name: 'on-branch',
          target: binding.object,
          branch: branch.key,
        });
        binding.dispose();

        expect(branchCheckpoint.branch).toBe(branch.key);
        // The branch checkpoint's heads differ from the root's (they live in the branch document).
        expect(branchCheckpoint.heads).not.toEqual(Version.create(doc, { name: 'x', target: root }).heads);

        const { commits } = createTimelineModel(doc, root);
        const onMain = commits.find((commit) => commit.message === 'on-main');
        const onBranch = commits.find((commit) => commit.message === 'on-branch');
        invariant(onMain && onBranch);
        // The main checkpoint lanes on main; the branch checkpoint lanes on the branch — NOT main.
        expect(onMain.branch).toBe(MAIN_BRANCH);
        expect(onBranch.branch).toBe(Branch.label(branch));
        expect(onBranch.branch).not.toBe(MAIN_BRANCH);
        // It descends from the branch fork node (or an earlier branch commit), never from main.
        expect(onBranch.parents ?? []).toContain(`branch-${branch.id}`);
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a branch forked from an earlier checkpoint descends from that checkpoint, not the latest commit',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Doc', content: '1' });
        yield* Database.add(doc);
        const root = yield* Database.load(doc.content);

        // Three checkpoints on main, then a branch forked from the SECOND (v2), not the tip.
        Version.create(doc, { name: 'v1', target: root });
        Obj.update(root, () => EchoText.update(root, 'content', '1 2'));
        const v2 = Version.create(doc, { name: 'v2', target: root });
        Obj.update(root, () => EchoText.update(root, 'content', '1 2 3'));
        const v3 = Version.create(doc, { name: 'v3', target: root });

        const branch = yield* Effect.promise(() => Branch.create(doc, { name: 'b', parent: root, heads: v2.heads }));
        expect(branch.anchor).toEqual([...v2.heads]);

        const { commits } = createTimelineModel(doc, root);
        const forkId = `branch-${branch.id}`;
        const fork = commits.find((commit) => commit.id === forkId);
        invariant(fork);
        // The fork descends from v2 — NOT from v3 (the latest main commit) or Now.
        expect(fork.parents).toEqual([v2.id]);
        expect(fork.parents).not.toContain(v3.id);
        // And it is ordered right after v2, before v3 (parents precede children; topological).
        const index = (id: string) => commits.findIndex((commit) => commit.id === id);
        expect(index(forkId)).toBeGreaterThan(index(v2.id));
        expect(index(forkId)).toBeLessThan(index(v3.id));
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
