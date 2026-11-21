//
// Copyright 2026 DXOS.org
//

import { parseSync } from 'oxc-parser';

import { type LineRange } from './select.ts';

type Node = { type: string; start: number; end: number; [key: string]: unknown };

const FUNCTION_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

const isNode = (value: unknown): value is Node =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  typeof value.type === 'string' &&
  'start' in value &&
  typeof value.start === 'number' &&
  'end' in value &&
  typeof value.end === 'number';

const identifierName = (value: unknown): string | undefined =>
  isNode(value) && value.type === 'Identifier' && typeof value.name === 'string' ? value.name : undefined;

const isFunction = (value: unknown): value is Node => isNode(value) && FUNCTION_TYPES.has(value.type);

/** The name a declaration, binding or member gives to its function, i.e. what its document symbol is called. */
const namedFunction = (node: Node): { name: string; fn: Node } | undefined => {
  let name: string | undefined;
  let fn: unknown;
  if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
    name = identifierName(node.id);
    fn = node;
  } else if (node.type === 'VariableDeclarator') {
    name = identifierName(node.id);
    fn = node.init;
  } else if (node.type === 'MethodDefinition' || node.type === 'Property' || node.type === 'PropertyDefinition') {
    name = identifierName(node.key);
    fn = node.value;
  }
  return name !== undefined && isFunction(fn) ? { name, fn } : undefined;
};

const lineStarts = (text: string): number[] => {
  const starts = [0];
  for (let index = 0; index < text.length; index++) {
    if (text.charCodeAt(index) === 10) {
      starts.push(index + 1);
    }
  }
  return starts;
};

const lineOf = (starts: number[], offset: number): number => {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (starts[mid] <= offset) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return low;
};

/**
 * Finds implementation bodies of a JS/TS file by parsing it in-process, with no language-server round trip.
 * A body runs from the line of its `{` to the line before its `}`, matching the regions VS Code's TS folding
 * provider and indentation folding produce, so `editor.fold` at that line folds exactly the body.
 * Returns `undefined` when the file does not parse, so the caller can fall back to the language server.
 */
export const findBodiesOxc = (filename: string, text: string, containerPattern: RegExp): LineRange[] | undefined => {
  const result = parseSync(filename, text);
  if (result.errors.some((error) => error.severity === 'Error')) {
    return undefined;
  }

  const starts = lineStarts(text);
  const bodies: LineRange[] = [];

  const fold = (body: Node) => {
    const start = lineOf(starts, body.start);
    const end = lineOf(starts, body.end - 1) - 1;
    if (end > start) {
      bodies.push({ start, end });
    }
  };

  const visitChildren = (node: Node) => {
    for (const key in node) {
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else {
        visit(value);
      }
    }
  };

  const visit = (value: unknown) => {
    if (!isNode(value)) {
      return;
    }

    // A function named like a container stays open, as its language-server symbol of that name would.
    const named = namedFunction(value);
    if (named && containerPattern.test(named.name) && isNode(named.fn.body)) {
      visitChildren(named.fn.body);
      return;
    }

    if (FUNCTION_TYPES.has(value.type) && isNode(value.body) && value.body.type === 'BlockStatement') {
      // Nested functions are hidden inside the folded body.
      fold(value.body);
      return;
    }

    if (value.type === 'CallExpression' && isNode(value.callee) && Array.isArray(value.arguments)) {
      const callee = text.slice(value.callee.start, value.callee.end);
      if (containerPattern.test(callee)) {
        // A suite's callback stays open so each test inside it folds on its own.
        for (const argument of value.arguments) {
          if (isNode(argument) && FUNCTION_TYPES.has(argument.type) && isNode(argument.body)) {
            visitChildren(argument.body);
          } else {
            visit(argument);
          }
        }
        return;
      }
    }

    visitChildren(value);
  };

  visit(result.program);
  return bodies.sort((left, right) => left.start - right.start);
};
