//
// Copyright 2025 DXOS.org
//

import { type Input } from '@lezer/common';
import { describe, test } from 'vitest';

import { parser } from './parser';

// Wrap a string as a Lezer Input.
const makeInput = (text: string): Input => ({
  length: text.length,
  chunk: (from: number) => text.slice(from),
  lineChunks: false,
  read: (from: number, to: number) => text.slice(from, to),
});

// Parse text and return node names with their matched text, depth-first.
const parseNodes = (text: string): { name: string; text: string }[] => {
  const input = makeInput(text);
  const parse = parser.startParse(input);
  const tree = parse.advance();
  if (!tree) {
    return [];
  }
  const nodes: { name: string; text: string }[] = [];
  const cursor = tree.cursor();
  do {
    nodes.push({ name: cursor.node.type.name, text: text.slice(cursor.from, cursor.to) });
  } while (cursor.next());
  return nodes;
};

// Parse and return only the non-Block node names (skip the root).
// Nodes are in depth-first order: a parent appears before its children.
const nodeNames = (text: string): string[] =>
  parseNodes(text)
    .filter(({ name }) => name !== 'Block')
    .map(({ name }) => name);

describe('mdl parser', () => {
  describe('KeyValue', () => {
    test('simple field', ({ expect }) => {
      // KeyValue is the parent; FieldName and TypeExpr are children (depth-first: parent first).
      expect(nodeNames('kind: PieceKind')).toEqual(['KeyValue', 'FieldName', 'TypeExpr']);
    });

    test('optional field', ({ expect }) => {
      expect(nodeNames('piece?: Piece')).toEqual(['KeyValue', 'FieldName', 'Optional', 'TypeExpr']);
    });

    test('field with inline comment', ({ expect }) => {
      expect(nodeNames('promotion?: PieceKind   # only valid for pawn')).toEqual([
        'KeyValue',
        'FieldName',
        'Optional',
        'TypeExpr',
        'Comment',
      ]);
    });

    test('field with union type', ({ expect }) => {
      expect(nodeNames('status: playing | check | checkmate | stalemate')).toEqual([
        'KeyValue',
        'FieldName',
        'TypeExpr',
      ]);
    });

    test('field with array type', ({ expect }) => {
      expect(nodeNames('moves: Move[]')).toEqual(['KeyValue', 'FieldName', 'TypeExpr']);
    });

    test('field with range', ({ expect }) => {
      expect(nodeNames('rank: 1..8')).toEqual(['KeyValue', 'FieldName', 'TypeExpr']);
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

  describe('Prose', () => {
    test('bare prose line', ({ expect }) => {
      expect(nodeNames('A two-player chess game plugin for DXOS Composer.')).toEqual(['Prose']);
    });

    test('indented prose', ({ expect }) => {
      expect(nodeNames('  Top-level ECHO object backing each article.')).toEqual(['Prose']);
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
        'TypeExpr', // kind: PieceKind
        'KeyValue',
        'FieldName',
        'TypeExpr', // color: Color
      ]);
    });

    test('feat block body with inline req', ({ expect }) => {
      const input = [
        'desc: Start Game',
        '# requirements follow',
        'req F-1.1: New Board created with pieces in standard starting positions.',
      ].join('\n');

      expect(nodeNames(input)).toEqual([
        'KeyValue',
        'FieldName',
        'TypeExpr', // desc: Start Game
        'Comment', // # requirements follow
        'KeyValue',
        'FieldName',
        'TypeExpr', // req F-1.1: ...
      ]);
    });

    test('mixed: fields, comments, prose', ({ expect }) => {
      const input = [
        'desc: An 8×8 grid of squares.',
        'fields:',
        '  squares: Square[8][8]   # row-major',
        '  turn: Color',
        '  status: playing | check | checkmate | stalemate',
      ].join('\n');

      const names = nodeNames(input);
      expect(names).toContain('Comment');
      expect(names.filter((n) => n === 'KeyValue').length).toBe(5);
      expect(names.filter((n) => n === 'TypeExpr').length).toBe(4); // fields: has no value
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
  });

  describe('edge cases', () => {
    test('empty input produces only Block', ({ expect }) => {
      expect(nodeNames('')).toEqual([]);
    });

    test('blank lines are ignored', ({ expect }) => {
      expect(nodeNames('kind: PieceKind\n\ncolor: Color')).toEqual([
        'KeyValue',
        'FieldName',
        'TypeExpr',
        'KeyValue',
        'FieldName',
        'TypeExpr',
      ]);
    });

    test('field with no value is still a KeyValue', ({ expect }) => {
      // e.g. "fields:" with no inline value — value section follows on next lines.
      expect(nodeNames('fields:')).toEqual(['KeyValue', 'FieldName']);
    });
  });
});
