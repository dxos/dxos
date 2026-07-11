//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { EntityId } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown';

import { Blogger } from '../types';
import { BloggerOperation, BloggerOperationHandlerSet } from './index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: BloggerOperationHandlerSet,
  types: [Blogger.Publication, Blogger.Post, Blogger.Draft, Markdown.Document],
  disableLlmMemoization: true,
});

describe('Blogger operations', () => {
  it.effect(
    'AddPublication creates and persists a Publication',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;

        const publicationRef = yield* Operation.invoke(BloggerOperation.AddPublication, {
          name: 'My Blog',
          target: db,
        });
        const publication = yield* Database.load(publicationRef);
        expect(publication.name).toBe('My Blog');
        expect(publication.posts).toEqual([]);

        const instructions = yield* Database.load(publication.instructions);
        expect(Obj.instanceOf(Markdown.Document, instructions)).toBe(true);

        // Persisted: resolvable by another `Database.load` off a freshly-created ref.
        const reloaded = yield* Database.load(publicationRef);
        expect(reloaded.id).toBe(publication.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'AddPost pushes a Post onto publication.posts with an outline and one initial draft',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;

        const publicationRef = yield* Operation.invoke(BloggerOperation.AddPublication, { target: db });
        const postRef = yield* Operation.invoke(BloggerOperation.AddPost, {
          publication: publicationRef,
          name: 'Hello World',
          target: db,
        });

        const post = yield* Database.load(postRef);

        const publication = yield* Database.load(publicationRef);
        expect(publication.posts).toHaveLength(1);
        expect(publication.posts?.[0]?.target?.id).toBe(post.id);

        expect(post.name).toBe('Hello World');

        const outline = yield* Database.load(post.outline);
        expect(Obj.instanceOf(Markdown.Document, outline)).toBe(true);

        expect(post.drafts).toHaveLength(1);
        const draft = yield* Database.load(post.drafts![0]!);
        expect(Obj.instanceOf(Blogger.Draft, draft)).toBe(true);
        expect(draft.label).toBe('Draft 1');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'AddDraft appends a new Draft to post.drafts',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;

        const publicationRef = yield* Operation.invoke(BloggerOperation.AddPublication, { target: db });
        const postRef = yield* Operation.invoke(BloggerOperation.AddPost, {
          publication: publicationRef,
          target: db,
        });

        const draftRef = yield* Operation.invoke(BloggerOperation.AddDraft, {
          post: postRef,
          createdAt: '2026-07-11T00:00:00Z',
        });

        const post = yield* Database.load(postRef);
        expect(post.drafts).toHaveLength(2);

        const draft = yield* Database.load(draftRef);
        expect(draft.label).toBe('Draft 2');
        expect(draft.createdAt).toBe('2026-07-11T00:00:00Z');

        const content = yield* Database.load(draft.content);
        expect(Obj.instanceOf(Markdown.Document, content)).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
