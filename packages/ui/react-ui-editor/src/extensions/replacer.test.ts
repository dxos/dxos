//
// Copyright 2025 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, expect, test } from 'vitest';

import { replacer } from './replacer';

describe('replacer extension', () => {
  test('creates extension with custom replacements and simulates typing', () => {
    const state = EditorState.create({
      extensions: [
        replacer({
          replacements: [
            { input: ':)', output: '😊' },
            { input: ':(', output: '😢' },
          ],
        }),
      ],
      doc: '',
    });

    // Create a minimal mock EditorView to test input handler
    let currentState = state;
    const mockView = {
      get state() {
        return currentState;
      },
      dispatch: (transaction: any) => {
        currentState = transaction.state || currentState.update(transaction).state;
      },
    } as any;

    // Get the input handler from the extension
    const extensions = currentState.facet(EditorView.inputHandler);
    const inputHandler = extensions[0];

    // Test typing ':' first - should not trigger replacement.
    let handled = inputHandler(mockView, 0, 0, ':', () =>
      mockView.state.update({ changes: { from: 0, to: 0, insert: ':' } }),
    );
    expect(handled).toBe(false); // Should not handle single ':'

    // Manually insert ':' to simulate first character.
    mockView.dispatch({
      changes: { from: 0, to: 0, insert: ':' },
      selection: { anchor: 1 },
    });
    expect(mockView.state.doc.toString()).toBe(':');

    // Test typing ')' which should trigger replacement.
    // The input handler is called with the position where the character will be inserted.
    // and it should handle the replacement before the character is actually inserted.
    handled = inputHandler(mockView, 1, 1, ')', () =>
      mockView.state.update({ changes: { from: 1, to: 1, insert: ')' } }),
    );
    expect(handled).toBe(true); // Should handle and replace ':)'
    expect(mockView.state.doc.toString()).toBe('😊');
  });

  test('creates extension with default replacements', () => {
    const state = EditorState.create({
      extensions: [replacer()],
      doc: 'test',
    });

    expect(state.doc.toString()).toBe('test');

    // Verify the extension is installed.
    const inputHandlers = state.facet(EditorView.inputHandler);
    expect(inputHandlers.length).toBeGreaterThan(0);
  });
});
