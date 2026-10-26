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
  for (const ref of presentation.slides) {
    const slide = yield* Database.load(ref);
    const content = yield* Database.load(slide.content);
    contents.push(Obj.instanceOf(Text.Text, content) ? content.content : '');
  }
  return contents;
});

describe('PresenterSkill operations', () => {
  it.effect(
    'CreatePresentation adds owned slides and files the presentation',
    Effect.fnUntraced(
      function* (_) {
        const slides = ['---\nlayout: cover\n---\n# Roadmap', '# Next'];
        const result = yield* Operation.invoke(PresenterOperation.CreatePresentation, { name: 'Roadmap', slides });
        expect(result.issues).toEqual([]);
        const id = result.id;
        if (!id) {
          throw new Error('No presentation was created.');
        }

        const presentation = yield* Database.resolve(EID.parse(id), Presentation.Presentation);
        expect(presentation.name).toBe('Roadmap');
        expect(yield* slideContents(presentation)).toEqual(slides);

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
    'CreatePresentation saves nothing while any slide has a problem',
    Effect.fnUntraced(
      function* (_) {
        const result = yield* Operation.invoke(PresenterOperation.CreatePresentation, {
          name: 'Roadmap',
          slides: ['# Roadmap', '  ', '---\nlayout: nope\n---\n# Next'],
        });
        expect(result.issues).toEqual(['Slide 2 is empty.', expect.stringMatching(/^Slide 3: .*nope/)]);
        expect(result.id).toBeUndefined();
        expect(yield* Database.query(Filter.type(Presentation.Presentation)).run).toHaveLength(0);
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
        const last = yield* Database.load(presentation.slides[presentation.slides.length - 1]);
        expect(last.content.target?.id).toBe(document.id);

        const neither = yield* Operation.invoke(PresenterOperation.AddSection, {
          presentation: Ref.make(presentation),
        });
        expect(neither.issues).toHaveLength(1);

        // A bad slide is not added, and its problem is numbered where it would have landed (appended, past the end).
        const count = presentation.slides.length;
        const bad = yield* Operation.invoke(PresenterOperation.AddSection, {
          presentation: Ref.make(presentation),
          content: '---\nlayout: nope\n---\n# Bad',
          index: 100,
        });
        expect(bad.issues).toEqual([expect.stringMatching(new RegExp(`^Slide ${count + 1}: `))]);
        expect(presentation.slides).toHaveLength(count);
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
