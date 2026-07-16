//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { SpaceProperties } from '@dxos/client-protocol';
import { Operation } from '@dxos/compute';
import { Collection, Database, Feed, Obj, Ref, URI } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { invariant } from '@dxos/invariant';
import { Text } from '@dxos/schema';
import { HasSubject } from '@dxos/types';

import { WithProperties } from '#testing';

import { Markdown, MarkdownOperation } from '../types';
import { MarkdownOperationHandlerSet } from './index';

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: MarkdownOperationHandlerSet,
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

        const branchText = yield* Database.resolve(URI.make(contentId), Text.Text);
        Obj.update(branchText, (branchText) => {
          branchText.content = 'alpha\nbravo\ncharlie\n';
        });

        const { conflicts, newContent } = yield* Operation.invoke(MarkdownOperation.MergeBranch, {
          doc: Ref.make(doc),
          branchId,
        });
        expect(conflicts).toBe(0);
        expect(newContent).toBe('alpha\nbravo\ncharlie\n');

        const rootText = yield* Database.load(doc.content);
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
