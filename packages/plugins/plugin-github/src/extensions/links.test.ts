//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { forceParsing } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, WidgetType } from '@codemirror/view';
import { describe, test } from 'vitest';

import { AnchorWidget, type WidgetDef, createMarkdownExtensions, decorationSetToArray } from '@dxos/ui-editor';

import { type GitHubLinkProps, githubLinks, parseGitHubLink } from './links';

/** Widget whose props are inspectable so tests can assert what the factory was handed. */
class TestWidget extends WidgetType {
  constructor(readonly props: GitHubLinkProps) {
    super();
  }

  override eq(other: this): boolean {
    return other instanceof TestWidget && other.props.url === this.props.url;
  }

  override toDOM(): HTMLElement {
    return document.createElement('span');
  }
}

const widgets = <T extends WidgetType>(doc: string, link?: WidgetDef<GitHubLinkProps>): T[] => {
  const view = new EditorView({
    state: EditorState.create({ doc, extensions: [createMarkdownExtensions(), githubLinks({ link })] }),
    parent: document.createElement('div'),
  });
  forceParsing(view, view.state.doc.length, 5_000);
  const out: T[] = [];
  for (const source of view.state.facet(EditorView.decorations)) {
    const set = typeof source === 'function' ? source(view) : source;
    if (!set) {
      continue;
    }
    for (const { value } of decorationSetToArray(set)) {
      if (value.spec?.widget instanceof WidgetType) {
        out.push(value.spec.widget as T);
      }
    }
  }
  view.destroy();
  return out;
};

describe('githubLinks', () => {
  test('parses repository, pull request and issue URLs', ({ expect }) => {
    expect(parseGitHubLink('https://github.com/dxos/dxos/pull/13031')).toEqual({
      owner: 'dxos',
      repo: 'dxos',
      kind: 'pull',
      number: 13031,
      url: 'https://github.com/dxos/dxos/pull/13031',
    });
    expect(parseGitHubLink('https://github.com/dxos/dxos/issues/12?x=1#top')?.kind).toBe('issue');
    expect(parseGitHubLink('https://github.com/dxos/dxos')).toEqual({
      owner: 'dxos',
      repo: 'dxos',
      kind: 'repo',
      url: 'https://github.com/dxos/dxos',
    });
    expect(parseGitHubLink('https://github.com/dxos/dxos/#readme')?.kind).toBe('repo');
    expect(parseGitHubLink('https://github.com/dxos/dxos/blob/main/README.md')).toBeUndefined();
    expect(parseGitHubLink('https://github.com/dxos')).toBeUndefined();
    expect(parseGitHubLink('https://example.com/dxos/dxos/pull/1')).toBeUndefined();
  });

  test('a pull request link becomes an anchor chip; other links are left alone', ({ expect }) => {
    const found = widgets<AnchorWidget>(
      'See [the fix](https://github.com/dxos/dxos/pull/13031) and [docs](https://example.com).',
    );
    expect(found.every((widget) => widget instanceof AnchorWidget)).toBe(true);
    expect(found.map((widget) => widget._dxn)).toEqual(['https://github.com/dxos/dxos/pull/13031']);
    expect(found[0]._label).toBe('the fix');
  });

  test('a host-provided link widget receives the parsed parts with the link props', ({ expect }) => {
    const found = widgets<TestWidget>('Fixed in [#7](https://github.com/dxos/dxos/issues/7).', {
      factory: (props) => new TestWidget(props),
    });
    expect(found).toHaveLength(1);
    expect(found[0].props).toMatchObject({
      label: '#7',
      url: 'https://github.com/dxos/dxos/issues/7',
      owner: 'dxos',
      repo: 'dxos',
      kind: 'issue',
      number: 7,
      block: false,
    });
  });
});
