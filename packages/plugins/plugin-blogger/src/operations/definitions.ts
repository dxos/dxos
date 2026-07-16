//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Collection, Database, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { Connection } from '@dxos/plugin-connector/types';

import { meta } from '#meta';
import { Blog } from '#types';

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
  output: Ref.Ref(Blog.Publication),
});

/**
 * Creates a new Post (an outline plus a single body document) and appends it to a Publication's
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
    publication: Ref.Ref(Blog.Publication).annotations({ description: 'The publication to add the post to.' }),
    name: Schema.optional(Schema.String).annotations({ description: 'The post name.' }),
    target: TargetSchema,
  }),
  output: Ref.Ref(Blog.Post),
});

/** Selects which contributed `PublisherService` to use; falls back to the first one when omitted. */
const PublisherIdSchema = Schema.optional(Schema.String).annotations({
  description: 'Selects a contributed publisher service by id; defaults to the first one available.',
});

/**
 * Bidirectionally syncs a Publication's posts with an external publisher (the provider calls them
 * "drafts"). Reconciliation, keyed by the remote id stored as a foreign key on each post's meta
 * (source = the publisher's `source`):
 * - post linked to a still-present remote draft → push the local body (local is source of truth);
 * - post linked to a remote draft that was deleted → clear the key, set `status: 'draft'`;
 * - post with no link → create the remote draft, stamp the key, set `status: 'published'`;
 * - remote draft not linked to any post → create a new local Post (stamped, `status: 'published'`).
 */
export const SyncPosts = Operation.make({
  meta: {
    key: makeKey('syncPosts'),
    name: 'Sync Posts',
    description: 'Bidirectionally sync a publication’s posts with its external publisher.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: Schema.Struct({
    publication: Ref.Ref(Blog.Publication).annotations({ description: 'The publication whose posts to sync.' }),
    connection: Ref.Ref(Connection.Connection).annotations({
      description: 'The publisher connection to sync through.',
    }),
    publisherId: PublisherIdSchema,
  }),
  output: Ref.Ref(Blog.Publication),
  services: [Capability.Service],
});
