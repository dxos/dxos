//
// Copyright 2025 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { describe, expect, test } from 'vitest';

import { substitutions } from './substitutions';

const createView = (extensions = [substitutions()]): EditorView =>
  new EditorView({ state: EditorState.create({ doc: '', extensions }) });

const type = (view: EditorView, from: number, insert: string): boolean => {
  const [handler] = view.state.facet(EditorView.inputHandler);
  return handler(view, from, from, insert, () => view.state.update({ changes: { from, to: from, insert } }));
};

const runKey = (view: EditorView, key: string): boolean => {
  const binding = view.state
    .facet(keymap)
    .flat()
    .find((item) => item.key === key);
  return binding?.run?.(view) ?? false;
};

describe('substitutions extension', () => {
  test('substitutes a typed sequence', () => {
    const view = createView([
      substitutions({
        substitutions: {
          ':)': '😊',
          ':(': '😢',
        },
        bindings: {},
      }),
    ]);

    try {
      expect(type(view, 0, ':')).toBe(false);
      view.dispatch({ changes: { from: 0, insert: ':' }, selection: { anchor: 1 } });
      expect(type(view, 1, ')')).toBe(true);
      expect(view.state.doc.toString()).toBe('😊');
    } finally {
      view.destroy();
    }
  });

  test('installs default sequence substitutions', () => {
    const view = createView();
    try {
      expect(view.state.facet(EditorView.inputHandler).length).toBeGreaterThan(0);
    } finally {
      view.destroy();
    }
  });

  test('inserts from a key chord', () => {
    const view = createView([
      substitutions({
        substitutions: {},
        bindings: { 'Alt--': '—' },
      }),
    ]);

    try {
      expect(runKey(view, 'Alt--')).toBe(true);
      expect(view.state.doc.toString()).toBe('—');
    } finally {
      view.destroy();
    }
  });

  test('default keys insert an em dash on Alt--', () => {
    const view = createView();
    try {
      expect(runKey(view, 'Alt--')).toBe(true);
      expect(view.state.doc.toString()).toBe('—');
    } finally {
      view.destroy();
    }
  });
});
