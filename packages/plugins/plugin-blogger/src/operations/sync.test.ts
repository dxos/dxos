//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { AccessToken } from '@dxos/link';
import { Connection } from '@dxos/plugin-connector/types';

import { Blog, Publisher } from '../types';
import { runSyncPosts } from './sync-posts';

const SOURCE = 'stub.test';

describe('SyncPosts', () => {
  test('pushes an unlinked local post to the publisher and marks it published', async () => {
    const { publication, post } = makePublicationWithPost({ content: 'hello world' });
    const { stub, calls } = makeStub([]);

    await EffectEx.runPromise(runSyncPosts(stub, publication, makeConnectionRef()));

    expect(calls).toEqual(['create']);
    expect(Obj.getKeys(post, SOURCE).map((key) => key.id)).toEqual(['new1']);
    expect(post.status).toBe('published');
  });

  test('updates a linked local post whose remote copy still exists (local wins)', async () => {
    const { publication, post } = makePublicationWithPost({ content: 'edited', remoteId: 'x1' });
    const { stub, calls } = makeStub([{ id: 'x1', text: 'remote body' }]);

    await EffectEx.runPromise(runSyncPosts(stub, publication, makeConnectionRef()));

    expect(calls).toEqual(['update']);
    expect(Obj.getKeys(post, SOURCE).map((key) => key.id)).toEqual(['x1']);
  });

  test('reverts a linked local post whose remote copy was deleted back to draft', async () => {
    const { publication, post } = makePublicationWithPost({
      content: 'orphaned',
      remoteId: 'gone',
      status: 'published',
    });
    const { stub, calls } = makeStub([]);

    await EffectEx.runPromise(runSyncPosts(stub, publication, makeConnectionRef()));

    expect(calls).toEqual([]);
    expect(Obj.getKeys(post, SOURCE)).toEqual([]);
    expect(post.status).toBe('draft');
  });

  test('pulls an unlinked remote draft into a new published post', async () => {
    const publication = Blog.makePublication();
    const { stub, calls } = makeStub([{ id: 'x2', text: 'remote body', title: 'Imported' }]);

    const result = await EffectEx.runPromise(runSyncPosts(stub, publication, makeConnectionRef()));

    expect(calls).toEqual([]);
    expect(result.posts).toHaveLength(1);
    const imported = result.posts?.[0]?.target;
    invariant(imported);
    expect(imported.content.target?.content.target?.content).toBe('remote body');
    expect(imported.status).toBe('published');
    expect(Obj.getKeys(imported, SOURCE).map((key) => key.id)).toEqual(['x2']);
  });

  test('falls back to getDraft when listDrafts omits the body text on a pulled draft', async () => {
    const publication = Blog.makePublication();
    const { stub, calls } = makeStub([{ id: 'x2', text: '' }]);

    const result = await EffectEx.runPromise(runSyncPosts(stub, publication, makeConnectionRef()));

    expect(calls).toEqual(['getDraft']);
    const imported = result.posts?.[result.posts.length - 1]?.target;
    invariant(imported);
    expect(imported.content.target?.content.target?.content).toBe('fetched body');
  });
});

/** Creates a publication holding one post with the given body, optional remote link, and status. */
const makePublicationWithPost = ({
  content,
  remoteId,
  status = 'draft',
}: {
  content: string;
  remoteId?: string;
  status?: Blog.PostStatus;
}): { publication: Blog.Publication; post: Blog.Post } => {
  const publication = Blog.makePublication();
  const post = Blog.makePost({ content });
  Obj.update(post, (post) => {
    post.status = status;
    if (remoteId) {
      Obj.getMeta(post).keys.push({ source: SOURCE, id: remoteId });
    }
  });
  Obj.update(publication, (publication) => {
    publication.posts = [...(publication.posts ?? []), Ref.make(post)];
  });
  return { publication, post };
};

/**
 * The `connection` ref is opaque to the sync handler — it is only forwarded to the `PublisherService`
 * calls, never dereferenced — so a minimal, schema-valid Connection is enough.
 */
const makeConnectionRef = (): Ref.Ref<Connection.Connection> => {
  const accessToken = AccessToken.make({ source: SOURCE, token: 'secret' });
  return Ref.make(Connection.make({ accessToken: Ref.make(accessToken) }));
};

/** A stub `PublisherService` whose `listDrafts` returns `remote`, recording each remote call. */
const makeStub = (remote: Publisher.PublisherDraft[]): { stub: Publisher.PublisherService; calls: string[] } => {
  const calls: string[] = [];
  const stub: Publisher.PublisherService = {
    id: 'stub',
    label: 'Stub',
    source: SOURCE,
    connectorId: 'stub',
    listDrafts: async () => remote,
    getDraft: async (_connection, id) => {
      calls.push('getDraft');
      return { id, text: 'fetched body' };
    },
    createDraft: async (_connection, input) => {
      calls.push('create');
      return { id: 'new1', text: input.text };
    },
    updateDraft: async (_connection, id, input) => {
      calls.push('update');
      return { id, text: input.text };
    },
    deleteDraft: async () => {
      calls.push('delete');
    },
  };
  return { stub, calls };
};
