//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Operation } from '@dxos/compute';
import { Collection, Database, Filter, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown';
import { Text } from '@dxos/schema';

import { Blog } from '../types';
import { BloggerOperation, BloggerOperationHandlerSet } from './index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: BloggerOperationHandlerSet,
  types: [Blog.Publication, Blog.Post, Markdown.Document, Text.Text, Collection.Collection],
  disableLlmMemoization: true,
});

describe('Blog operations', () => {
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
        expect(Obj.instanceOf(Text.Text, instructions)).toBe(true);

        // Persisted: actually attached to the space graph, not merely resolvable by
        // `Database.load` off a live in-memory ref. A query against the database only
        // returns objects that were added to it.
        const publications = yield* Effect.promise(() => db.query(Filter.type(Blog.Publication)).run());
        expect(publications.map((candidate) => candidate.id)).toContain(publication.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'AddPost pushes a Post onto publication.posts with an outline and a body document',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;

        const publicationRef = yield* Operation.invoke(BloggerOperation.AddPublication, { target: db });

        // A `Collection` target (rather than the bare `db`) is required to make the
        // persistence assertion below non-vacuous: pushing `Ref.make(post)` onto the
        // already-attached `publication.posts` array auto-attaches `post` to the database
        // regardless of whether the handler's `CollectionModel.add` call ran (ECHO attaches
        // any referenced live object reachable from an already-attached object). Only the
        // `Collection.objects` array is exclusively populated by `CollectionModel.add`.
        const collection = Collection.make({ objects: [] });
        db.add(collection);

        const postRef = yield* Operation.invoke(BloggerOperation.AddPost, {
          publication: publicationRef,
          name: 'Hello World',
          target: collection,
        });

        const post = yield* Database.load(postRef);

        const publication = yield* Database.load(publicationRef);
        expect(publication.posts).toHaveLength(1);
        expect(publication.posts?.[0]?.target?.id).toBe(post.id);

        expect(post.name).toBe('Hello World');
        expect(post.status).toBe('draft');

        const outline = yield* Database.load(post.outline);
        expect(Obj.instanceOf(Text.Text, outline)).toBe(true);

        const content = yield* Database.load(post.content);
        expect(Obj.instanceOf(Markdown.Document, content)).toBe(true);

        // Persisted: actually filed under the target `Collection`'s `objects`, which is
        // populated only by the handler's `CollectionModel.add` call.
        expect(collection.objects.some((ref) => ref.target?.id === post.id)).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
