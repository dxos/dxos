//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { Connection } from '@dxos/plugin-connector/types';
import { AccessToken } from '@dxos/types';

import { Blogger, Publisher } from '../types';
import { runImportDrafts } from './import-drafts';
import { runPublishDraft } from './publish-draft';
import { runUnpublishDraft } from './unpublish-draft';

/**
 * The `connection` ref is opaque to every sync handler — it is only forwarded to the
 * `PublisherService` calls, never dereferenced — so a minimal, schema-valid Connection is enough.
 */
const makeConnectionRef = (): Ref.Ref<Connection.Connection> => {
  const accessToken = AccessToken.make({ source: 'stub.test', token: 'secret' });
  return Ref.make(Connection.make({ accessToken: Ref.make(accessToken) }));
};

const makeStub = (): { stub: Publisher.PublisherService; calls: string[] } => {
  const calls: string[] = [];
  const stub: Publisher.PublisherService = {
    id: 'stub',
    label: 'Stub',
    source: 'stub.test',
    listDrafts: async () => [
      { id: 'x1', text: 'already linked' },
      { id: 'x2', text: 'remote body' },
    ],
    getDraft: async (_connection, id) => ({ id, text: 'remote body' }),
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

describe('Blogger sync operations', () => {
  test('PublishDraft creates the remote draft and stamps a foreign key on an unlinked draft', async () => {
    const { stub, calls } = makeStub();
    const draft = Blogger.makeDraft({ content: 'hello world' });
    const connection = makeConnectionRef();

    const result = await EffectEx.runPromise(runPublishDraft(stub, draft, connection));

    expect(calls).toEqual(['create']);
    expect(Obj.getKeys(result, stub.source).map((key) => key.id)).toEqual(['new1']);
  });

  test('PublishDraft updates the remote draft when already linked, without re-creating', async () => {
    const { stub, calls } = makeStub();
    const draft = Blogger.makeDraft({ content: 'hello world' });
    Obj.update(draft, (draft) => {
      Obj.getMeta(draft).keys.push({ source: stub.source, id: 'existing1' });
    });
    const connection = makeConnectionRef();

    await EffectEx.runPromise(runPublishDraft(stub, draft, connection));

    expect(calls).toEqual(['update']);
    expect(Obj.getKeys(draft, stub.source).map((key) => key.id)).toEqual(['existing1']);
  });

  test('ImportDrafts creates a local draft for an unlinked remote id and skips one already linked', async () => {
    const post = Blogger.makePost();
    const initialDraft = post.drafts?.[0]?.target;
    expect(initialDraft).toBeDefined();
    invariant(initialDraft);
    // Link the post's initial draft to remote id 'x1' so the stub's matching listDrafts entry is skipped.
    Obj.update(initialDraft, (initialDraft) => {
      Obj.getMeta(initialDraft).keys.push({ source: 'stub.test', id: 'x1' });
    });

    const { stub, calls } = makeStub();
    const connection = makeConnectionRef();
    const draftsBefore = post.drafts?.length ?? 0;

    const result = await EffectEx.runPromise(runImportDrafts(stub, post, connection));

    // Only the unlinked remote draft ('x2') was imported; 'x1' was skipped (already linked), so
    // `createDraft`/`updateDraft` (which import never calls) never fired.
    expect(calls).toEqual([]);
    expect(result.drafts).toHaveLength(draftsBefore + 1);

    const importedRef = result.drafts?.[result.drafts.length - 1];
    const imported = importedRef?.target;
    expect(imported).toBeDefined();
    invariant(imported);
    expect(imported.content.target?.content.target?.content).toBe('remote body');
    expect(Obj.getKeys(imported, stub.source).map((key) => key.id)).toEqual(['x2']);
  });

  test('UnpublishDraft deletes the remote draft and clears the foreign key', async () => {
    const { stub, calls } = makeStub();
    const draft = Blogger.makeDraft({ content: 'hello world' });
    Obj.update(draft, (draft) => {
      Obj.getMeta(draft).keys.push({ source: stub.source, id: 'new1' });
    });
    const connection = makeConnectionRef();

    const result = await EffectEx.runPromise(runUnpublishDraft(stub, draft, connection));

    expect(calls).toEqual(['delete']);
    expect(Obj.getKeys(result, stub.source)).toEqual([]);
  });

  test('UnpublishDraft is a no-op when the draft was never linked', async () => {
    const { stub, calls } = makeStub();
    const draft = Blogger.makeDraft({ content: 'hello world' });
    const connection = makeConnectionRef();

    await EffectEx.runPromise(runUnpublishDraft(stub, draft, connection));

    expect(calls).toEqual([]);
  });
});
