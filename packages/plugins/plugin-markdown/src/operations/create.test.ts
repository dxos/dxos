//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import { WithProperties } from '@dxos/app-toolkit/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, type Collection, Database, EID, Filter } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import * as Markdown from '@dxos/plugin-markdown/Markdown';

import { OperationTestLayer } from '#testing';
import { MarkdownOperation } from '#types';

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

        const [properties] = yield* Database.query(Filter.type(SpaceProperties)).run;
        const rootRef = Annotation.get(properties, AppAnnotation.RootCollectionAnnotation).pipe(Option.getOrThrow);
        const root = yield* Database.load<Collection.Collection>(rootRef);
        expect(root.objects.map((ref) => ref.target?.id)).toContain(doc.id);
      },
      WithProperties,
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
