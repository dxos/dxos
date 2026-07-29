//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, EID } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown';

import { OperationTestLayer, WithProperties } from '#testing';

import { MarkdownOperation } from '../types';

EntityId.dangerouslyDisableRandomness();

describe('Create', () => {
  it.effect(
    'call a function to create a markdown document',
    Effect.fnUntraced(
      function* (_) {
        const name = 'BlueYard';
        const content = 'Founders and portfolio of BlueYard.';
        const result = yield* Operation.invoke(MarkdownOperation.Create, {
          name,
          content,
        });

        const doc = yield* Database.resolve(EID.parse(result.id), Markdown.Document);
        expect(doc.name).toBe(name);
        const text = yield* Database.load(doc.content);
        expect(text.content).toBe(content);
      },
      WithProperties,
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
