//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { WithProperties } from '@dxos/app-toolkit/testing';
import { Operation } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown';

import { OperationTestLayer } from '#testing';

import { MarkdownOperation } from '../types';

EntityId.dangerouslyDisableRandomness();

describe('Open', () => {
  it.effect(
    'returns the document content',
    Effect.fnUntraced(
      function* (_) {
        const doc = Markdown.make({ name: 'Shopping list', content: '# Shopping list\n- milk' });
        yield* Database.add(doc);
        yield* Database.flush();

        const { content } = yield* Operation.invoke(MarkdownOperation.Open, { doc: Ref.make(doc) });

        expect(content).toBe('# Shopping list\n- milk');
      },
      WithProperties,
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
