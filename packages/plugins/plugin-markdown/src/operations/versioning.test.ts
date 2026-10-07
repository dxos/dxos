//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { WithProperties } from '@dxos/app-toolkit/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import * as Operation from '@dxos/compute/Operation';
import { Collection, Database, Feed, Ref, URI } from '@dxos/echo';
import { getObjectOnBranch } from '@dxos/echo-client';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { Text } from '@dxos/schema';
import { HasSubject } from '@dxos/types';

import { MarkdownOperationHandlerSet } from '#operations';
import { Markdown, MarkdownOperation } from '#types';

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: MarkdownOperationHandlerSet.handlers,
  types: [SpaceProperties, Collection.Collection, Markdown.Document, Text.Text, HasSubject.HasSubject, Feed.Feed],
});

describe('versioning operations', () => {
  it.effect(
    'checkpoint, branch, edit, merge, history round-trip',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Doc', content: 'alpha\nbravo\n' });
        yield* Database.add(doc);

        const { versionId } = yield* Operation.invoke(MarkdownOperation.CreateCheckpoint, {
          doc: Ref.make(doc),
          name: 'v1',
        });
        expect(versionId).toBeDefined();

        const { branchId, contentId } = yield* Operation.invoke(MarkdownOperation.CreateBranch, {
          doc: Ref.make(doc),
          name: 'draft',
        });
        expect(branchId).toBeDefined();
        // Core branches share the parent Text's object; the returned content id is the canonical text.
        const canonicalText = yield* Database.resolve(URI.make(contentId), Text.Text);
        const rootText = yield* Database.load(doc.content);
        expect(canonicalText.id).toBe(rootText.id);

        // The agent flow: edit the BRANCH via the update operation's branchId; main is untouched.
        // Read back from the branch rather than from the operation, which returns a receipt.
        yield* Operation.invoke(MarkdownOperation.Update, {
          doc: Ref.make(doc),
          edits: [{ oldString: 'bravo\n', newString: 'bravo\ncharlie\n' }],
          branchId,
        });
        const branchData = (yield* Effect.promise(() => getObjectOnBranch(rootText, branchId))) as {
          content?: string;
        };
        expect(branchData.content).toBe('alpha\nbravo\ncharlie\n');
        expect(rootText.content).toBe('alpha\nbravo\n');

        const { conflicts, newContent } = yield* Operation.invoke(MarkdownOperation.MergeBranch, {
          doc: Ref.make(doc),
          branchId,
        });
        expect(conflicts).toBe(0);
        expect(newContent).toBe('alpha\nbravo\ncharlie\n');
        expect(rootText.content).toBe('alpha\nbravo\ncharlie\n');

        const history = yield* Operation.invoke(MarkdownOperation.GetHistory, { doc: Ref.make(doc) });
        expect(history.versions.map(({ name }) => name)).toContain('v1');
        expect(history.versions.map(({ name }) => name)).toContain('merge: draft');
        const branch = history.branches.find(({ id }) => id === branchId);
        invariant(branch);
        expect(branch.status).toBe('merged');
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
