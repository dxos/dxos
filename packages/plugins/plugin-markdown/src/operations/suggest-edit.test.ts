//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import { Operation } from '@dxos/compute';
import { Collection, Database, Feed, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
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

describe('suggest-edit operation', () => {
  it.effect(
    "find-or-creates the caller's suggestion branch, idempotent per author",
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Doc', content: 'alpha\nbravo\n' });
        yield* Database.add(doc);

        const first = yield* Operation.invoke(MarkdownOperation.SuggestEdit, {
          doc: Ref.make(doc),
          creator: 'did:alice',
        });
        expect(first.branchId).toBeDefined();

        // Idempotent: the same author reuses their existing suggestion branch.
        const again = yield* Operation.invoke(MarkdownOperation.SuggestEdit, {
          doc: Ref.make(doc),
          creator: 'did:alice',
        });
        expect(again.branchId).toBe(first.branchId);

        // A different author gets a distinct branch.
        const bob = yield* Operation.invoke(MarkdownOperation.SuggestEdit, {
          doc: Ref.make(doc),
          creator: 'did:bob',
        });
        expect(bob.branchId).not.toBe(first.branchId);

        // The branch is a suggestion branch keyed by its creator (read the raw history record —
        // GetHistory projects a subset for agents; the review layer reads history.branches directly).
        const branch = doc.history?.branches.find(({ id }) => id === first.branchId);
        invariant(branch);
        expect(branch.kind).toBe('suggestion');
        expect(branch.creator).toBe('did:alice');

        // Editing the suggestion branch accrues changes off main; the base document is untouched.
        const rootText = yield* Database.load(doc.content);
        yield* Operation.invoke(MarkdownOperation.Update, {
          doc: Ref.make(doc),
          edits: [{ oldString: 'bravo', newString: 'BRAVO' }],
          branchId: first.branchId,
        });
        expect(rootText.content).toBe('alpha\nbravo\n');
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
