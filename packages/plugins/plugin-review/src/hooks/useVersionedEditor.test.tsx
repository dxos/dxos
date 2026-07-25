//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { act, renderHook, waitFor } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Text as EchoText, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Client, ClientProvider, fromHost } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { ViewStateProvider } from '@dxos/react-ui-attention';
import { Text } from '@dxos/schema';

import { useVersionedEditor } from './useVersionedEditor';
import { useVersioning } from './useVersioning';

/**
 * Headless harness for the editor-binding lifecycle: drives the SAME hook pipeline the markdown
 * article mounts (`useVersioning` → `useVersionedEditor`) through mode-switch sequences and asserts
 * the binding outputs (editability, bound subject, own-branch content) at each step. Exists because
 * the mode-switch state machine kept regressing under manual testing — every reported failure here
 * (typed text struck through after a round-trip, the editor ending read-only) becomes a replayable
 * sequence.
 */
const useBindingHarness = (doc: Markdown.Document, identity: { did: string }) => {
  const versioning = useVersioning(doc);
  const editor = useVersionedEditor({
    object: doc,
    versioning,
    identity: identity as Parameters<typeof useVersionedEditor>[0]['identity'],
    mainContent: doc.content.target?.content,
    diffView: undefined,
    viewMode: 'preview',
    id: 'test-surface',
  });
  return { versioning, editor };
};

describe('editor binding lifecycle', () => {
  let client: Client;
  let space: Space;
  let doc: Markdown.Document;
  let identity: { did: string };

  beforeEach(async () => {
    client = new Client({ services: fromHost() });
    await client.initialize();
    await client.halo.createIdentity();
    await client.addTypes([Markdown.Document, Text.Text]);
    space = await client.spaces.create();
    doc = space.db.add(Markdown.make({ name: 'doc', content: 'alpha\nbravo\n' }));
    await space.db.flush({ indexes: true });
    await doc.content.load();
    const did = client.halo.identity.get()?.did;
    invariant(did, 'identity not initialized');
    identity = { did };
  });

  afterEach(async () => {
    await client.destroy();
  });

  const wrapper = ({ children }: PropsWithChildren) => (
    <ClientProvider client={client}>
      <ViewStateProvider>{children}</ViewStateProvider>
    </ClientProvider>
  );

  const setup = () => renderHook(() => useBindingHarness(doc, identity), { wrapper });

  /** Waits out the async own-branch (or branch) binding so assertions never race it. */
  const settled = async (result: { current: ReturnType<typeof useBindingHarness> }) => {
    await waitFor(() => expect(result.current.editor.branchLoading).toBe(false), { timeout: 10_000 });
  };

  test('default posture: ambient, editable, bound to the document', async () => {
    const { result } = setup();
    await settled(result);
    expect(result.current.editor.ambient).toBe(true);
    expect(result.current.editor.effectiveViewMode).toBe('preview');
    expect(result.current.editor.editorObject).toBe(doc);
    expect(result.current.editor.editorKey).toBe('current');
  });

  test('entering Suggesting binds the user’s own suggestion branch', async () => {
    const { result } = setup();
    await settled(result);
    act(() => result.current.versioning.setMode('suggesting'));
    await settled(result);
    expect(result.current.editor.ambientSuggesting).toBe(true);
    expect(result.current.editor.ownBranchText).toBeDefined();
    // The branch starts as a copy of main, and the editor binds to it — not to main.
    expect(result.current.editor.editorObject).toBe(result.current.editor.ownBranchText);
    expect(result.current.editor.effectiveViewMode).not.toBe('readonly');
  });

  test('mode round-trips always end editable (F1.7)', async () => {
    const { result } = setup();
    await settled(result);
    // Suggesting → Markdown → Plain text → Suggesting, twice — the reported repro ended read-only.
    for (let cycle = 0; cycle < 2; cycle++) {
      act(() => result.current.versioning.setMode('suggesting'));
      await settled(result);
      act(() => result.current.versioning.setMode('editing'));
      await settled(result);
      act(() => result.current.versioning.setMode('editing'));
      await settled(result);
      act(() => result.current.versioning.setMode('suggesting'));
      await settled(result);
      expect(result.current.editor.ambientSuggesting).toBe(true);
      expect(result.current.editor.effectiveViewMode).not.toBe('readonly');
      expect(result.current.editor.editorObject).toBe(result.current.editor.ownBranchText);
    }
  });

  // Reproduces F1.2: text typed on MAIN between Suggesting sessions is missing from the (stale) own
  // branch, so re-entering Suggesting diffs it as the user's own DELETION — rendering a strikethrough
  // over text they just typed. The own branch must fast-forward to main on re-entry when it carries
  // no edits of its own. Flips to passing when that lands.
  test.fails('re-entering Suggesting fast-forwards an unchanged own branch (F1.2)', async () => {
    const { result } = setup();
    await settled(result);

    // First Suggesting session: branch is created from current main, no edits made.
    act(() => result.current.versioning.setMode('suggesting'));
    await settled(result);
    const firstBranchContent = result.current.editor.ownBranchText?.content;
    expect(firstBranchContent).toBe('alpha\nbravo\n');

    // Back to editing; the user types on main.
    act(() => result.current.versioning.setMode('editing'));
    await settled(result);
    const root = doc.content.target;
    invariant(root, 'root not loaded');
    act(() => {
      Obj.update(root, () => {
        EchoText.update(root, 'content', 'alpha\nbravo\nworld\n');
      });
    });

    // Re-enter Suggesting: the branch has no own edits, so it must reflect current main — otherwise
    // "world" renders as the user's own deletion.
    act(() => result.current.versioning.setMode('suggesting'));
    await settled(result);
    await waitFor(() => expect(result.current.editor.ownBranchText?.content).toContain('world'), {
      timeout: 10_000,
    });
  });
});
