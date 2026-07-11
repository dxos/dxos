//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Collection, Database, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';
import { Blogger } from '#types';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/** The database or collection a new object is filed under; matches `SpaceOperation.AddObject`'s `target`. */
const TargetSchema = Schema.Union(Database.Database, Type.getSchema(Collection.Collection)).annotations({
  description: 'The database or collection to add to.',
});

/**
 * Creates a new blog Publication (with an empty instructions document and no posts) and adds it to
 * a space.
 */
export const AddPublication = Operation.make({
  meta: {
    key: makeKey('addPublication'),
    name: 'Add Publication',
    description: 'Create a new blog publication.',
    icon: 'ph--books--regular',
  },
  input: Schema.Struct({
    name: Schema.optional(Schema.String).annotations({ description: 'The publication name.' }),
    target: TargetSchema,
  }),
  output: Ref.Ref(Blogger.Publication),
});

/**
 * Creates a new Post (an outline plus one initial draft) and appends it to a Publication's
 * `posts`, also filing it in the space graph under `target`.
 */
export const AddPost = Operation.make({
  meta: {
    key: makeKey('addPost'),
    name: 'Add Post',
    description: 'Create a new post and add it to a publication.',
    icon: 'ph--article--regular',
  },
  input: Schema.Struct({
    publication: Ref.Ref(Blogger.Publication).annotations({ description: 'The publication to add the post to.' }),
    name: Schema.optional(Schema.String).annotations({ description: 'The post name.' }),
    createdAt: Schema.optional(Schema.String).annotations({
      description: "ISO 8601 timestamp for the post's initial draft.",
    }),
    target: TargetSchema,
  }),
  output: Ref.Ref(Blogger.Post),
});

/**
 * Creates a new Draft (wrapping a fresh markdown document) and appends it to a Post's `drafts`.
 */
export const AddDraft = Operation.make({
  meta: {
    key: makeKey('addDraft'),
    name: 'Add Draft',
    description: 'Create a new draft version of a post.',
    icon: 'ph--file-plus--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    post: Ref.Ref(Blogger.Post).annotations({ description: 'The post to add the draft to.' }),
    createdAt: Schema.optional(Schema.String).annotations({ description: 'ISO 8601 timestamp for the draft.' }),
  }),
  output: Ref.Ref(Blogger.Draft),
});
