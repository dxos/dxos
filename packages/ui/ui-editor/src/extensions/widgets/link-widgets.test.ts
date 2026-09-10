//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { describe, test } from 'vitest';

import { createMarkdownExtensions } from '../language/markdown';
import { isWidgetLink, linkWidgets, matchHosts, matchSchemes } from './link-widgets';

describe('linkWidgets', () => {
  test('registers what it matches, so the decorator can leave those links to the widget', ({ expect }) => {
    const state = EditorState.create({
      doc: '',
      extensions: [
        createMarkdownExtensions(),
        linkWidgets({ match: matchSchemes(['echo:']), link: { factory: () => null } }),
        linkWidgets({ match: matchHosts(['github.com']), link: { factory: () => null } }),
      ],
    });
    expect(isWidgetLink(state, 'echo:///123')).toBe(true);
    expect(isWidgetLink(state, 'https://github.com/dxos/dxos/pull/1')).toBe(true);
    expect(isWidgetLink(state, 'https://example.com')).toBe(false);
  });

  test('nothing is claimed without a link widget', ({ expect }) => {
    const state = EditorState.create({ doc: '', extensions: [createMarkdownExtensions()] });
    expect(isWidgetLink(state, 'echo:///123')).toBe(false);
  });
});
