//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import { Operation, Skill } from '@dxos/compute';
import { Collection, Database, Feed, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown';
import { HasSubject } from '@dxos/types';

import { WithProperties } from '#testing';

import { MarkdownOperation } from '../types';
import { MarkdownOperationHandlerSet } from './index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: MarkdownOperationHandlerSet,
  types: [SpaceProperties, Collection.Collection, Skill.Skill, Markdown.Document, HasSubject.HasSubject, Feed.Feed],
  disableLlmMemoization: true,
});

describe('Open', () => {
  it.effect(
    'returns the document content',
    Effect.fnUntraced(
      function* ({ expect }) {
        const doc = Markdown.make({ name: 'Shopping list', content: '# Shopping list\n- milk' });
        yield* Database.add(doc);
        yield* Database.flush();

        const { content } = yield* Operation.invoke(MarkdownOperation.Open, { doc: Ref.make(doc) });

        expect(content).toBe('# Shopping list\n- milk');
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
