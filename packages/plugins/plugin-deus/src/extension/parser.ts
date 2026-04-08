//
// Copyright 2026 DXOS.org
//

import { type Input, type PartialParse, NodeType, NodeSet, Tree, type TreeFragment } from '@lezer/common';

// Node type IDs.
const enum Type {
  Block = 1,
  KeyValue,
  FieldName,
  Optional,
  TypeExpr,
  UnionExpr,
  ArrayExpr,
  Identifier,
  NumberRange,
  Prose,
  Comment,
}

const nodeTypes = [
  NodeType.none, // id: 0 (required placeholder)
  NodeType.define({ id: Type.Block, name: 'Block', top: true }),
  NodeType.define({ id: Type.KeyValue, name: 'KeyValue' }),
  NodeType.define({ id: Type.FieldName, name: 'FieldName' }),
  NodeType.define({ id: Type.Optional, name: 'Optional' }),
  NodeType.define({ id: Type.TypeExpr, name: 'TypeExpr' }),
  NodeType.define({ id: Type.UnionExpr, name: 'UnionExpr' }),
  NodeType.define({ id: Type.ArrayExpr, name: 'ArrayExpr' }),
  NodeType.define({ id: Type.Identifier, name: 'Identifier' }),
  NodeType.define({ id: Type.NumberRange, name: 'NumberRange' }),
  NodeType.define({ id: Type.Prose, name: 'Prose' }),
  NodeType.define({ id: Type.Comment, name: 'Comment' }),
];

const nodeSet = new NodeSet(nodeTypes);

type NodeEntry = { id: number; from: number; to: number; size: number };

// Simple hand-written parser — produces a tree sufficient for highlighting.
// Will be replaced with a generated Lezer parser once the grammar is finalised.
class MdlParser implements PartialParse {
  #input: Input;
  #pos = 0;
  #nodes: NodeEntry[] = [];

  constructor(input: Input, startPos: number) {
    this.#input = input;
    this.#pos = startPos;
  }

  advance(): Tree | null {
    const text = this.#input.read(0, this.#input.length);
    this.#parse(text);
    return this.#buildTree(text.length);
  }

  get parsedPos(): number {
    return this.#pos;
  }

  get stoppedAt(): number | null {
    return null;
  }

  stopAt(_pos: number): void {}

  #parse(text: string): void {
    const lines = text.split('\n');
    let pos = 0;
    for (const line of lines) {
      const trimmed = line.trimStart();
      const indent = line.length - trimmed.length;

      if (trimmed.startsWith('#')) {
        this.#nodes.push({ id: Type.Comment, from: pos + indent, to: pos + line.length, size: 4 });
      } else {
        const colonIdx = trimmed.search(/\??\s*:/);
        if (colonIdx > 0) {
          const hasOptional = trimmed[colonIdx] === '?';
          const childStart = this.#nodes.length;

          // FieldName — excludes trailing '?' if optional.
          const nameEnd = hasOptional ? colonIdx : colonIdx;
          this.#nodes.push({ id: Type.FieldName, from: pos + indent, to: pos + indent + nameEnd, size: 4 });

          // Optional marker.
          if (hasOptional) {
            this.#nodes.push({
              id: Type.Optional,
              from: pos + indent + colonIdx,
              to: pos + indent + colonIdx + 1,
              size: 4,
            });
          }

          // TypeExpr — everything after ": " up to " #".
          const afterColon = trimmed.indexOf(':', colonIdx) + 1;
          const commentStart = trimmed.indexOf(' #', afterColon);
          const valueEnd = commentStart > 0 ? commentStart : trimmed.length;
          const valueStr = trimmed.slice(afterColon, valueEnd).trim();
          if (valueStr) {
            // Compute position relative to trimmed to avoid wrong-occurrence issues.
            const relIdx = trimmed.indexOf(valueStr, afterColon);
            const valueFrom = pos + indent + relIdx;
            this.#nodes.push({ id: Type.TypeExpr, from: valueFrom, to: valueFrom + valueStr.length, size: 4 });
          }

          // Inline comment — commentStart is relative to trimmed; +1 skips the space before '#'.
          if (commentStart > 0) {
            const commentFrom = pos + indent + commentStart + 1;
            this.#nodes.push({ id: Type.Comment, from: commentFrom, to: pos + line.length, size: 4 });
          }

          // Wrap children in KeyValue. Size = 4 (self) + sum of child sizes.
          const childCount = this.#nodes.length - childStart;
          this.#nodes.push({
            id: Type.KeyValue,
            from: pos + indent,
            to: pos + line.length,
            size: 4 * (1 + childCount),
          });
        } else if (trimmed.length > 0) {
          this.#nodes.push({ id: Type.Prose, from: pos + indent, to: pos + line.length, size: 4 });
        }
      }

      pos += line.length + 1; // +1 for \n
    }
  }

  #buildTree(length: number): Tree {
    return Tree.build({
      buffer: this.#nodes.flatMap(({ id, from, to, size }) => [id, from, to, size]),
      nodeSet,
      topID: Type.Block,
      length,
    });
  }
}

export const parser = {
  createParse: (input: Input, _fragments: readonly TreeFragment[], ranges: readonly { from: number; to: number }[]) =>
    new MdlParser(input, ranges[0]?.from ?? 0),
  startParse: (
    input: Input | string,
    _fragments?: readonly TreeFragment[],
    ranges?: readonly { from: number; to: number }[],
  ) => {
    const inp: Input =
      typeof input === 'string'
        ? {
            length: input.length,
            chunk: (from) => input.slice(from),
            lineChunks: false,
            read: (from, to) => input.slice(from, to),
          }
        : input;
    return new MdlParser(inp, ranges?.[0]?.from ?? 0);
  },
  parse: (input: Input) => new MdlParser(input, 0).advance() as Tree,
};
