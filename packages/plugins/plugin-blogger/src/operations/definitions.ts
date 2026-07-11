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
  input: Schema.Struct({
    post: Ref.Ref(Blogger.Post).annotations({ description: 'The post to add the draft to.' }),
    createdAt: Schema.optional(Schema.String).annotations({ description: 'ISO 8601 timestamp for the draft.' }),
  }),
  output: Ref.Ref(Blogger.Draft),
});

/** Selects which contributed `PublisherService` to use; falls back to the first one when omitted. */
const PublisherIdSchema = Schema.optional(Schema.String).annotations({
  description: 'Selects a contributed publisher service by id; defaults to the first one available.',
});

/**
 * Pushes a Draft's current body to its external publisher (Task 3's `PublisherService`), creating the
 * remote draft on first publish or updating it thereafter. Tracks the remote id as a foreign key on
 * the draft, keyed by the publisher's `source`.
 */
export const PublishDraft = Operation.make({
  meta: {
    key: makeKey('publishDraft'),
    name: 'Publish Draft',
    description: 'Push a draft to its external publisher, creating or updating the remote copy.',
    icon: 'ph--cloud-arrow-up--regular',
  },
  input: Schema.Struct({
    draft: Ref.Ref(Blogger.Draft).annotations({ description: 'The draft to publish.' }),
    connection: Ref.Ref(Connection.Connection).annotations({
      description: 'The publisher connection to push through.',
    }),
    publisherId: PublisherIdSchema,
  }),
  output: Ref.Ref(Blogger.Draft),
  services: [Capability.Service],
});

/**
 * Pulls drafts from the external publisher that are not yet linked to a local draft, creating one
 * local Draft per new remote draft and appending it to the Post's `drafts`.
 */
export const ImportDrafts = Operation.make({
  meta: {
    key: makeKey('importDrafts'),
    name: 'Import Drafts',
    description: 'Pull drafts from the external publisher into a post.',
    icon: 'ph--cloud-arrow-down--regular',
  },
  input: Schema.Struct({
    post: Ref.Ref(Blogger.Post).annotations({ description: 'The post to import drafts into.' }),
    connection: Ref.Ref(Connection.Connection).annotations({
      description: 'The publisher connection to pull from.',
    }),
    publisherId: PublisherIdSchema,
  }),
  output: Ref.Ref(Blogger.Post),
  services: [Capability.Service],
});

/**
 * Deletes a Draft's remote copy (if linked) from the external publisher and clears its foreign key.
 */
export const UnpublishDraft = Operation.make({
  meta: {
    key: makeKey('unpublishDraft'),
    name: 'Unpublish Draft',
    description: 'Delete a draft from its external publisher.',
    icon: 'ph--cloud-slash--regular',
  },
  input: Schema.Struct({
    draft: Ref.Ref(Blogger.Draft).annotations({ description: 'The draft to unpublish.' }),
    connection: Ref.Ref(Connection.Connection).annotations({
      description: 'The publisher connection to delete through.',
    }),
    publisherId: PublisherIdSchema,
  }),
  output: Ref.Ref(Blogger.Draft),
  services: [Capability.Service],
});
