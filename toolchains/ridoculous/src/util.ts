//
// Copyright 2022 DXOS.org
//

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

export type VisitorCallback = (directive: string, args: string[], node: any, index: number | null, parent: any) => void

// TODO(burdon): Use this to clone the tree.
//  https://github.com/syntax-tree/unist-util-map
//  https://www.npmjs.com/package/unist-util-modify-children

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
