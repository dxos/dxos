//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { type SyntaxNode } from '@lezer/common';
import { describe, test } from 'vitest';

import { invariant } from '@dxos/invariant';

import { findNextNode, findNode, outliner } from './outliner';
import { createMarkdownExtensions } from '../..';
import { str } from '../../stories';

const doc = str(
  // 0, 7
  '- [ ] A',
  // 8, 47
  '- [ ] B',
  // 16, 25
  '  - [ ] C',
  // 26, 47
  '  - [ ] D',
  // 36, 47
  '    - [ ] E',
);

const getText = (state: EditorState, node: SyntaxNode) => {
  const line = state.doc.lineAt(node.from);
  const text = state.doc.sliceString(line.from, line.to);
  const [, , match] = text.match(/^\s*- (\[ \]|\[x\])? (.*)$/) ?? [];
  return match;
};

describe('outliner', () => {
  const state = EditorState.create({
    doc,
    extensions: [createMarkdownExtensions(), outliner()],
  });

  test('sanity', ({ expect }) => {
    const text = state.doc.sliceString(0, state.doc.length);
    expect(text).to.equal(doc);
  });

  test('findNode', ({ expect }) => {
    const line = state.doc.lineAt(state.doc.length);
    const tree = syntaxTree(state);
    const node = findNode(tree, line.from, 'ListItem');
    invariant(node);
    const text = getText(state, node!);
    expect(text).to.equal('E');
  });

  test('findNextNode', ({ expect }) => {
    const getNext = () => {
      invariant(next);
      next = findNextNode(next, 'ListItem');
      return getText(state, next!);
    };

    const tree = syntaxTree(state);
    const cursor = tree.cursor();
    let next: SyntaxNode | undefined = cursor.node;
    {
      const text = getNext();
      expect(text).to.equal('A');
    }
    {
      const text = getNext();
      expect(text).to.equal('B');
    }
    {
      const text = getNext();
      expect(text).to.equal('C');
    }
    {
      const text = getNext();
      expect(text).to.equal('D');
    }
    {
      const text = getNext();
      expect(text).to.equal('E');
    }
    {
      next = findNextNode(next, 'ListItem');
      expect(next).to.be.undefined;
    }
  });
});
