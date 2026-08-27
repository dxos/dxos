//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { Repo } from '@dxos/types';
import { createMarkdownExtensions } from '@dxos/ui-editor';

import { type GitHubReferenceResolver, githubReferences, referenceUrl } from './references';

const REPO = 'dxos/dxos';

const createView = (doc: string, resolve: GitHubReferenceResolver = (number) => referenceUrl(REPO, number)) => {
  const parent = document.createElement('div');
  return new EditorView({
    state: EditorState.create({
      doc,
      extensions: [createMarkdownExtensions(), githubReferences({ resolve }), EditorView.editable.of(false)],
    }),
    parent,
  });
};

const links = (view: EditorView): { text: string; href: string }[] =>
  Array.from(view.dom.querySelectorAll('a.cm-link')).map((anchor) => ({
    text: anchor.textContent ?? '',
    href: anchor.getAttribute('href') ?? '',
  }));

describe('github references', () => {
  test('decorates a reference as a link to the repository', ({ expect }) => {
    const view = createView('Blocked on #12752 until Friday.');
    expect(links(view)).toEqual([{ text: '#12752', href: 'https://github.com/dxos/dxos/issues/12752' }]);
    view.destroy();
  });

  test('decorates every reference in the document', ({ expect }) => {
    const view = createView('Supersedes #1 and #22; see #333.');
    expect(links(view).map(({ text }) => text)).toEqual(['#1', '#22', '#333']);
    view.destroy();
  });

  test('leaves a reference alone when the repository is unknown', ({ expect }) => {
    const view = createView('Blocked on #12752.', () => undefined);
    expect(links(view)).toEqual([]);
    view.destroy();
  });

  test('ignores a `#` that is not a reference', ({ expect }) => {
    const view = createView('# Heading\n\nColour #ff0000, anchor page#42, and a hash#tag.');
    expect(links(view)).toEqual([]);
    view.destroy();
  });

  test('ignores references inside code', ({ expect }) => {
    const view = createView('Inline `#12752` and\n\n```\nconst id = #99;\n```\n');
    expect(links(view)).toEqual([]);
    view.destroy();
  });

  test('ignores a reference inside a link target', ({ expect }) => {
    const view = createView('[the PR](https://github.com/dxos/dxos/pull/12752#issuecomment-1)');
    expect(links(view).map(({ href }) => href)).not.toContain('https://github.com/dxos/dxos/issues/1');
    view.destroy();
  });

  test('a repo object supplies the target', ({ expect }) => {
    const repo = Repo.make({ name: 'dxos', owner: 'dxos', url: 'https://github.com/dxos/dxos' });
    const view = createView('Blocked on #12752.', (number) => referenceUrl(Repo.fullName(repo), number));
    expect(links(view)).toEqual([{ text: '#12752', href: 'https://github.com/dxos/dxos/issues/12752' }]);
    view.destroy();
  });

  test('a heading still carries references in its prose', ({ expect }) => {
    const view = createView('## Notes on #7');
    expect(links(view)).toEqual([{ text: '#7', href: 'https://github.com/dxos/dxos/issues/7' }]);
    view.destroy();
  });
});
