//
// Copyright 2026 DXOS.org
//

import { type parseSync } from 'oxc-parser';

/**
 * Structural access to the `oxc` AST, shared by the analyzer and the type propagator. The AST types
 * come from the parser's own return type: `@oxc-project/types` is also published standalone and the
 * two copies are not structurally interchangeable.
 */

export type ParseResult = ReturnType<typeof parseSync>;
export type Program = ParseResult['program'];
export type Statement = Program['body'][number];
export type Comment = ParseResult['comments'][number];

/** Any AST node: every oxc node carries `type`, `start`, `end`; the rest is walked generically. */
export type Node = { type: string; start: number; end: number; [key: string]: unknown };

export const isNode = (value: unknown): value is Node =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { type?: unknown }).type === 'string' &&
  typeof (value as { start?: unknown }).start === 'number';

/** The child node under `key`, if it is one. */
export const child = (node: Node, key: string): Node | undefined => {
  const value = node[key];
  return isNode(value) ? value : undefined;
};

/** The node list under `key`; holes and non-nodes are dropped. */
export const childList = (node: Node, key: string): Node[] => {
  const value = node[key];
  return Array.isArray(value) ? value.filter(isNode) : [];
};

export const children = (node: Node): Node[] => {
  const found: Node[] = [];
  // `for…in` rather than `Object.entries`: no pair arrays per node, which dominated every walk.
  for (const key in node) {
    const value = node[key];
    if (typeof value !== 'object' || value === null || key === 'parent') {
      continue;
    }
    if (isNode(value)) {
      found.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (isNode(item)) {
          found.push(item);
        }
      }
    }
  }
  return found;
};

/** Depth-first walk with the ancestor chain; the visitor returns `false` to skip a subtree. */
export const walk = (
  node: Node,
  ancestors: Node[],
  visit: (node: Node, ancestors: Node[]) => boolean | undefined,
): void => {
  if (visit(node, ancestors) === false) {
    return;
  }
  ancestors.push(node);
  for (const next of children(node)) {
    walk(next, ancestors, visit);
  }
  ancestors.pop();
};

export const nameOf = (node: Node | undefined): string | undefined =>
  node && (node.type === 'Identifier' || node.type === 'JSXIdentifier') && typeof node.name === 'string'
    ? node.name
    : undefined;
