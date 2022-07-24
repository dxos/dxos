//
// Copyright 2022 DXOS.org
//

import { arrayIterate } from 'array-iterate';
import { visit } from 'unist-util-visit';

/**
 * Util to remove trailing blank lines.
 */
export const removeTrailing = (content: string) => {
  const lines = content.split('\n');
  let n;
  for (n = lines.length - 1; n > 0; n--) {
    if (lines[n].trim() !== '') {
      break;
    }
  }
  if (n < lines.length - 1) {
    lines.splice(n + 1);
    content = lines.join('\n');
  }

  return content;
};

/**
 * Util to create regexp from set of parts to aid comprehension.
 */
export const regex = (parts: RegExp[]) => {
  const [first, ...rest] = parts;
  return new RegExp(rest.reduce((res, p) => res + p.source, first.source));
};

/**
 * Match directive.
 * <!-- @directive(arg1, arg2) -->
 */
export const directiveRegex = regex([
  /<!--\s*/, // Opening comment.
  /@(\w+)\s*/, // Group: directive (e.g., `code`).
  /(?:\((.+)\))?/,
  /\s+-->/ // Closing comment.
]);

/**
 * Test if the node is a directive.
 */
export const isDirective = (node) => {
  if (node.type === 'html') {
    const match = node.value.trim().match(directiveRegex);
    if (match) {
      const [, directive, args] = match;
      return [directive, args];
    }
  }
};

export type VisitorCallback = (directive: string, args: string[], node: any, index: number | null, parent: any) => void

/**
 * Visit directives.
 */
export const visitDirectives = (tree: any, callback: VisitorCallback) => {
  visit(tree, 'html', (node, i, parent) => {
    const match = node.value.trim().match(directiveRegex);
    if (match) {
      const [, directive, args] = match;
      callback(directive, args ? args.split(/\s*,\s*/) : [], node, i, parent);
    }
  });
};

/**
 * Visit nodes and allow callback to replace nodes.
 */
// TODO(burdon): Make recursive.
export const visitAndReplace = (tree, callback) => {
  arrayIterate(tree.children, (node, index) => {
    let [nodes = [], skip = 1] = callback(node, index, tree) ?? [];
    if (nodes.length) {
      skip = Math.max(skip, 1);
      tree.children.splice(index, skip, ...nodes);
    }

    return index + skip;
  }, tree);
};
