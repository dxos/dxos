//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { fromHost } from '@dxos/client/local';
import { Obj, Ref } from '@dxos/echo';
import { URI } from '@dxos/keys';
import { Client } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { Text } from '@dxos/schema';
import { EditorState, EditorView } from '@dxos/ui-editor';

import { Markdown } from '#types';

import { useExtensions } from './useExtensions.tsx';

describe('useExtensions content binding guard', () => {
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

  // Without a persistence binding, the automerge extension's attach-reconcile can replace the whole
  // document with the loaded value, silently destroying anything typed while unresolved.
  test('an unresolved content ref renders the editor non-editable', ({ expect }) => {
    // Content pointed at an object that is not in the database: a ref that never resolves, a
    // permanent stand-in for the load window.
    const doc = space.db.add(
      Obj.make(Markdown.Document, {
        name: 'pending',
        content: Ref.fromURI(URI.make(`echo://${space.id}/01JMMGP4B2VZ8Q3Y6K5W7XCDEF`)),
      }),
    );

    const { result } = renderHook(() => useExtensions({ id: 'test-surface', object: doc }));
    const state = EditorState.create({ extensions: result.current });

    expect(state.readOnly).toBe(true);
    expect(state.facet(EditorView.editable)).toBe(false);
  });

  test('a resolved content ref renders the editor editable', async ({ expect }) => {
    const doc = space.db.add(Markdown.make({ name: 'ready', content: 'hello' }));
    await space.db.flush({ indexes: true });
    await doc.content.load();

    const { result } = renderHook(() => useExtensions({ id: 'test-surface', object: doc }));
    const state = EditorState.create({ extensions: result.current });

    expect(state.readOnly).toBe(false);
    expect(state.facet(EditorView.editable)).toBe(true);
  });
});
