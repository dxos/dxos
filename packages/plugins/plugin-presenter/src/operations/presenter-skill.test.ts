//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import { WithProperties } from '@dxos/app-toolkit/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, type Collection, Database, EID, Filter, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';

import { Presentation, PresenterOperation } from '#types';

import { OperationTestLayer } from './operation-test-layer.ts';

EntityId.dangerouslyDisableRandomness();

const slideContents = Effect.fnUntraced(function* (presentation: Presentation.Presentation) {
  const contents: string[] = [];
  for (const section of presentation.sections) {
    const target = yield* Database.load(section);
    contents.push(Obj.instanceOf(Text.Text, target) ? target.content : '');
  }
  return contents;
});

describe('PresenterSkill operations', () => {
  it.effect(
    'CreatePresentation adds owned slides, files the presentation, and reports problems',
    Effect.fnUntraced(
      function* (_) {
        const result = yield* Operation.invoke(PresenterOperation.CreatePresentation, {
          name: 'Roadmap',
          slides: ['---\nlayout: cover\n---\n# Roadmap', '  ', '---\nlayout: nope\n---\n# Next'],
        });
        expect(result.issues).toEqual([
          'Slide 2 is empty and was left out.',
          expect.stringMatching(/^Slide 3: .*nope/),
        ]);

        const presentation = yield* Database.resolve(EID.parse(result.id), Presentation.Presentation);
        expect(presentation.name).toBe('Roadmap');
        expect(yield* slideContents(presentation)).toEqual([
          '---\nlayout: cover\n---\n# Roadmap',
          '---\nlayout: nope\n---\n# Next',
        ]);

        const [properties] = yield* Database.query(Filter.type(SpaceProperties)).run;
        const rootRef = Annotation.get(properties, AppAnnotation.RootCollectionAnnotation).pipe(Option.getOrThrow);
        const root = yield* Database.load<Collection.Collection>(rootRef);
        expect(root.objects.map((ref) => ref.target?.id)).toContain(presentation.id);
      },
      WithProperties,
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'AddSection inserts a new slide at an index, or links an existing object',
    Effect.fnUntraced(
      function* (_) {
        const presentation = yield* Database.add(Presentation.make({ name: 'Deck', slides: ['# One', '# Three'] }));
        const added = yield* Operation.invoke(PresenterOperation.AddSection, {
          presentation: Ref.make(presentation),
          content: '# Two',
          index: 1,
        });
        expect(added.issues).toEqual([]);
        expect(yield* slideContents(presentation)).toEqual(['# One', '# Two', '# Three']);

        const document = yield* Database.add(Markdown.make({ name: 'Notes', content: '# Notes' }));
        yield* Operation.invoke(PresenterOperation.AddSection, {
          presentation: Ref.make(presentation),
          object: Ref.make(document),
        });
        const last = yield* Database.load(presentation.sections[presentation.sections.length - 1]);
        expect(last.id).toBe(document.id);

        const neither = yield* Operation.invoke(PresenterOperation.AddSection, {
          presentation: Ref.make(presentation),
        });
        expect(neither.issues).toHaveLength(1);
      },
      WithProperties,
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'ListLayouts names each layout with the markers of its later regions, and the frontmatter keys',
    Effect.fnUntraced(
      function* (_) {
        const { layouts, frontmatter } = yield* Operation.invoke(PresenterOperation.ListLayouts, {});
        expect(layouts).toContainEqual({ name: 'three-cols', slots: ['::middle::', '::right::'] });
        expect(layouts).toContainEqual({ name: 'cover', slots: [] });
        expect(frontmatter).toEqual(expect.arrayContaining(['layout', 'bleed', 'backgroundVideo']));
      },
      WithProperties,
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
