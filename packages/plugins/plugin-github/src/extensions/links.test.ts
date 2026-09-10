//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { forceParsing } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { createMarkdownExtensions, decorationSetToArray } from '@dxos/ui-editor';

import { GitHubLinkWidget, githubLinks, parseGitHubLink } from './links';

const widgets = (doc: string): GitHubLinkWidget[] => {
  const view = new EditorView({
    state: EditorState.create({ doc, extensions: [createMarkdownExtensions(), githubLinks()] }),
    parent: document.createElement('div'),
  });
  forceParsing(view, view.state.doc.length, 5_000);
  const out: GitHubLinkWidget[] = [];
  for (const source of view.state.facet(EditorView.decorations)) {
    const set = typeof source === 'function' ? source(view) : source;
    if (!set) {
      continue;
    }
    for (const { value } of decorationSetToArray(set)) {
      if (value.spec?.widget instanceof GitHubLinkWidget) {
        out.push(value.spec.widget);
      }
    }
  }
  view.destroy();
  return out;
};

describe('githubLinks', () => {
  test('parses pull request and issue URLs', ({ expect }) => {
    expect(parseGitHubLink('https://github.com/dxos/dxos/pull/13031')).toEqual({
      owner: 'dxos',
      repo: 'dxos',
      kind: 'pull',
      number: 13031,
      url: 'https://github.com/dxos/dxos/pull/13031',
    });
    expect(parseGitHubLink('https://github.com/dxos/dxos/issues/12?x=1#top')?.kind).toBe('issue');
    expect(parseGitHubLink('https://github.com/dxos/dxos')).toBeUndefined();
    expect(parseGitHubLink('https://example.com/dxos/dxos/pull/1')).toBeUndefined();
  });

  test('a pull request link becomes a chip; other links are left alone', ({ expect }) => {
    const found = widgets('See [the fix](https://github.com/dxos/dxos/pull/13031) and [docs](https://example.com).');
    expect(found.map((widget) => widget.link.number)).toEqual([13031]);
    const chip = found[0].toDOM();
    expect(chip.textContent).toBe('dxos/dxos#13031');
    expect(chip.getAttribute('href')).toBe('https://github.com/dxos/dxos/pull/13031');
  });
});
