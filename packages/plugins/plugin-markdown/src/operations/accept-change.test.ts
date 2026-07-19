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
import { toCursorRange } from '@dxos/echo-client';
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

describe('accept-change operation', () => {
  it.effect(
    'cherry-picks a single hunk from a branch into the base',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Doc', content: 'alpha\nbravo\ncharlie\n' });
        yield* Database.add(doc);
        const rootText = yield* Database.load(doc.content);

        // Branch off, then edit only the middle line on the branch; main stays untouched.
        const { branchId } = yield* Operation.invoke(MarkdownOperation.CreateBranch, {
          doc: Ref.make(doc),
          name: 'draft',
        });
        const { newContent: branchContent } = yield* Operation.invoke(MarkdownOperation.Update, {
          doc: Ref.make(doc),
          edits: [{ oldString: 'bravo', newString: 'BRAVO' }],
          branchId,
        });
        expect(branchContent).toBe('alpha\nBRAVO\ncharlie\n');
        expect(rootText.content).toBe('alpha\nbravo\ncharlie\n');

        // Anchor covering the 'bravo' region on the base (core branch name === branchId).
        const accessor = Doc.createAccessor(rootText, ['content']);
        const anchor = toCursorRange(accessor, 6, 11);
        const { undo } = yield* Operation.invoke(CollaborationOperation.AcceptChange, {
          subject: doc,
          anchor,
          branch: branchId,
        });

        // The changed hunk lands on the base; the surrounding lines are unchanged.
        expect(rootText.content).toBe('alpha\nBRAVO\ncharlie\n');

        // Undo the accept via the returned splice (RestoreText): the base reverts.
        expect(undo).toBeDefined();
        yield* Operation.invoke(CollaborationOperation.RestoreText, {
          subject: doc,
          from: undo!.from,
          del: undo!.del,
          insert: undo!.insert,
        });
        expect(rootText.content).toBe('alpha\nbravo\ncharlie\n');
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
