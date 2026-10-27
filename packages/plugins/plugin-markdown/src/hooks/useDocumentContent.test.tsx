//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { fromHost } from '@dxos/client/local';
import { Obj, Ref } from '@dxos/echo';
import { URI } from '@dxos/keys';
import { Client } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { Text } from '@dxos/schema';

import { Markdown } from '#types';

import { useDocumentContent } from './useDocumentContent.ts';

describe('useDocumentContent', () => {
  let client: Client;
  let space: Space;

  beforeEach(async () => {
    client = new Client({ services: fromHost() });
    await client.initialize();
    await client.halo.createIdentity();
    await client.addTypes([Markdown.Document, Text.Text]);
    space = await client.spaces.create();
  });

  afterEach(async () => {
    await client.destroy();
  });

  test('content that is not in the database is missing', async ({ expect }) => {
    const doc = space.db.add(
      Obj.make(Markdown.Document, {
        name: 'missing',
        content: Ref.fromURI(URI.make(`echo://${space.id}/01JMMGP4B2VZ8Q3Y6K5W7XCDEF`)),
      }),
    );

    const { result } = renderHook(() => useDocumentContent(doc));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('missing'));
  });

  test('deleted content is deleted', async ({ expect }) => {
    const doc = space.db.add(Markdown.make({ name: 'deleted', content: 'hello' }));
    space.db.remove(await doc.content.load());
    await space.db.flush({ indexes: true });

    const { result } = renderHook(() => useDocumentContent(doc));
    await waitFor(() => expect(result.current.status).toBe('deleted'));
  });

  test('content deleted while bound turns deleted', async ({ expect }) => {
    const doc = space.db.add(Markdown.make({ name: 'live', content: 'hello' }));
    await space.db.flush({ indexes: true });
    const text = await doc.content.load();

    const { result } = renderHook(() => useDocumentContent(doc));
    expect(result.current).toEqual({ target: text });

    space.db.remove(text);
    await waitFor(() => expect(result.current.status).toBe('deleted'));
  });
});
