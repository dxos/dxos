//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { mdlBlockLanguage } from './syntax';

// Parse text and return node names with their matched text, depth-first.
const parseNodes = (text: string): { name: string; text: string }[] => {
  const tree = mdlBlockLanguage.parser.parse(text);
  const nodes: { name: string; text: string }[] = [];
  const cursor = tree.cursor();
  do {
    nodes.push({ name: cursor.node.type.name, text: text.slice(cursor.from, cursor.to) });
  } while (cursor.next());
  return nodes;
};

// Return named rule node names in depth-first order, excluding Block and
// anonymous punctuation tokens (which start with a non-capital character).
const nodeNames = (text: string): string[] =>
  parseNodes(text)
    .filter(({ name }) => /^[A-Z]/.test(name) && name !== 'Block')
    .map(({ name }) => name);

describe('mdl parser', () => {
  describe('KeyValue', () => {
    test('simple field', ({ expect }) => {
      expect(nodeNames('kind: PieceKind')).toEqual(['KeyValue', 'FieldName', 'TypeExpr', 'TypeAtom', 'TypeName']);
    });

    test('optional field', ({ expect }) => {
      expect(nodeNames('piece?: Piece')).toEqual([
        'KeyValue',
        'FieldName',
        'Optional',
        'TypeExpr',
        'TypeAtom',
        'TypeName',
      ]);
    });

    test('field with inline comment', ({ expect }) => {
      expect(nodeNames('promotion?: PieceKind   # only valid for pawn')).toEqual([
        'KeyValue',
        'FieldName',
        'Optional',
        'TypeExpr',
        'TypeAtom',
        'TypeName',
        'Comment',
      ]);
    });

    test('field with union type', ({ expect }) => {
      expect(nodeNames('status: active | archived')).toEqual([
        'KeyValue',
        'FieldName',
        'TypeExpr',
        'TypeAtom',
        'TypeName',
        'Pipe',
        'TypeAtom',
        'TypeName',
      ]);
    });

    test('field with array type', ({ expect }) => {
      expect(nodeNames('moves: Move[]')).toEqual([
        'KeyValue',
        'FieldName',
        'TypeExpr',
        'TypeAtom',
        'ArrayExpr',
        'TypeName',
      ]);
    });

    test('field with range', ({ expect }) => {
      expect(nodeNames('rank: 1..8')).toEqual([
        'KeyValue',
        'FieldName',
        'TypeExpr',
        'TypeAtom',
        'NumberRange',
        'Number',
        'Number',
      ]);
    });

    test('field with no value', ({ expect }) => {
      // e.g. "fields:" with no inline value — sub-fields follow on next lines.
      expect(nodeNames('fields:')).toEqual(['KeyValue', 'FieldName']);
    });
  });

  describe('Comment', () => {
    test('standalone comment', ({ expect }) => {
      expect(nodeNames('# only valid for pawn reaching back rank')).toEqual(['Comment']);
    });

    test('comment with leading spaces', ({ expect }) => {
      expect(nodeNames('  # indented comment')).toEqual(['Comment']);
    });
  });

  describe('multi-line blocks', () => {
    test('type block body', ({ expect }) => {
      const input = ['fields:', '  kind: PieceKind', '  color: Color'].join('\n');
      expect(nodeNames(input)).toEqual([
        'KeyValue',
        'FieldName', // fields: (no value)
        'KeyValue',
        'FieldName',
        'TypeExpr',
        'TypeAtom',
        'TypeName', // kind: PieceKind
        'KeyValue',
        'FieldName',
        'TypeExpr',
        'TypeAtom',
        'TypeName', // color: Color
      ]);
    });

    test('block body with field, comment, and field', ({ expect }) => {
      const input = ['desc: Foo', '# separator', 'req: Bar'].join('\n');
      expect(nodeNames(input)).toEqual([
        'KeyValue',
        'FieldName',
        'TypeExpr',
        'TypeAtom',
        'TypeName', // desc: Foo
        'Comment', // # separator
        'KeyValue',
        'FieldName',
        'TypeExpr',
        'TypeAtom',
        'TypeName', // req: Bar
      ]);
    });

    test('union field is present in mixed block', ({ expect }) => {
      const input = ['fields:', '  turn: Color', '  status: active | archived'].join('\n');
      const names = nodeNames(input);
      expect(names.filter((name) => name === 'KeyValue').length).toBe(3);
      expect(names.filter((name) => name === 'Pipe').length).toBe(1);
    });
  });

  describe('node positions', () => {
    test('FieldName spans the key text', ({ expect }) => {
      const text = 'kind: PieceKind';
      const nodes = parseNodes(text).filter(({ name }) => name === 'FieldName');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].text).toBe('kind');
    });

    test('TypeExpr spans the value text', ({ expect }) => {
      const text = 'kind: PieceKind';
      const nodes = parseNodes(text).filter(({ name }) => name === 'TypeExpr');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].text).toBe('PieceKind');
    });

    test('TypeName spans each identifier in a union', ({ expect }) => {
      const text = 'status: active | archived';
      const nodes = parseNodes(text).filter(({ name }) => name === 'TypeName');
      expect(nodes.map(({ text: txt }) => txt)).toEqual(['active', 'archived']);
    });

    test('Optional spans the ? character', ({ expect }) => {
      const text = 'piece?: Piece';
      const nodes = parseNodes(text).filter(({ name }) => name === 'Optional');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].text).toBe('?');
    });

    test('Comment spans from # to end of line', ({ expect }) => {
      const text = 'rank: 1..8  # 1 to 8 inclusive';
      const nodes = parseNodes(text).filter(({ name }) => name === 'Comment');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].text).toMatch(/^# 1 to 8 inclusive/);
    });

    test('NumberRange spans both bounds', ({ expect }) => {
      const text = 'rank: 1..8';
      const nodes = parseNodes(text).filter(({ name }) => name === 'NumberRange');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].text).toBe('1..8');
    });

    test('ArrayExpr spans TypeName and brackets', ({ expect }) => {
      const text = 'moves: Move[]';
      const nodes = parseNodes(text).filter(({ name }) => name === 'ArrayExpr');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].text).toBe('Move[]');
    });
  });

  describe('edge cases', () => {
    test('empty input produces no named nodes', ({ expect }) => {
      expect(nodeNames('')).toEqual([]);
    });

    test('blank lines are skipped', ({ expect }) => {
      expect(nodeNames('kind: PieceKind\n\ncolor: Color')).toEqual([
        'KeyValue',
        'FieldName',
        'TypeExpr',
        'TypeAtom',
        'TypeName',
        'KeyValue',
        'FieldName',
        'TypeExpr',
        'TypeAtom',
        'TypeName',
      ]);
    });
  });
});
