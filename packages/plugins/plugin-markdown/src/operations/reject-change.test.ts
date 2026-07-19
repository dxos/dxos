//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { CollaborationOperation } from '@dxos/app-toolkit';
import { SpaceProperties } from '@dxos/client-protocol';
import { Operation } from '@dxos/compute';
import { Collection, Database, Feed, Ref } from '@dxos/echo';
import { getObjectOnBranch, toCursorRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { TestHelpers } from '@dxos/effect/testing';
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

const branchContent = (rootText: Text.Text, branchId: string) =>
  Effect.promise(async () => {
    const data = (await getObjectOnBranch(rootText, branchId)) as { content?: string };
    return typeof data.content === 'string' ? data.content : '';
  });

describe('reject-change operation', () => {
  it.effect(
    'reverts a single hunk on the branch back to the base, leaving other branch edits intact',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Doc', content: 'alpha\nbravo\ncharlie\ndelta\n' });
        yield* Database.add(doc);
        const rootText = yield* Database.load(doc.content);

        // Branch off, then edit two NON-adjacent lines on the branch (separated by unchanged
        // 'charlie', so they are distinct hunks); main stays untouched.
        const { branchId } = yield* Operation.invoke(MarkdownOperation.CreateBranch, {
          doc: Ref.make(doc),
          name: 'draft',
        });
        yield* Operation.invoke(MarkdownOperation.Update, {
          doc: Ref.make(doc),
          edits: [{ oldString: 'bravo', newString: 'BRAVO' }],
          branchId,
        });
        const { newContent } = yield* Operation.invoke(MarkdownOperation.Update, {
          doc: Ref.make(doc),
          edits: [{ oldString: 'delta', newString: 'DELTA' }],
          branchId,
        });
        expect(newContent).toBe('alpha\nBRAVO\ncharlie\nDELTA\n');

        // Reject only the 'bravo' change: anchor covers 'bravo' on the base (main).
        const accessor = Doc.createAccessor(rootText, ['content']);
        const anchor = toCursorRange(accessor, 6, 11);
        yield* Operation.invoke(CollaborationOperation.RejectChange, {
          subject: doc,
          anchor,
          branch: branchId,
        });

        // The branch reverts only that hunk to the base; the other branch edit (DELTA) survives;
        // main is untouched.
        expect(yield* branchContent(rootText, branchId)).toBe('alpha\nbravo\ncharlie\nDELTA\n');
        expect(rootText.content).toBe('alpha\nbravo\ncharlie\ndelta\n');
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
