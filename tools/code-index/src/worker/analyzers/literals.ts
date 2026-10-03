//
// Copyright 2026 DXOS.org
//

import { type Node, child, childList, nameOf } from './ast.ts';

/**
 * `deus:literal`: the string-valued properties of the object literals a top-level symbol's
 * constructing call is given, as `path=value` (`design/ONTOLOGY.md` § Literals). Generic on purpose —
 * it knows no framework, so `meta.key` only becomes an operation's key in a rule.
 */

// Depth and count bounds keep a large configuration object from flooding a symbol with facts.
const MAX_DEPTH = 4;
const MAX_LITERALS = 32;
const MAX_LENGTH = 256;

const WRAPPERS = new Set([
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'ParenthesizedExpression',
  'TSInstantiationExpression',
]);

const unwrap = (node: Node): Node => {
  let current = node;
  for (
    let next = child(current, 'expression');
    WRAPPERS.has(current.type) && next;
    next = child(current, 'expression')
  ) {
    current = next;
  }
  return current;
};

const isPipe = (node: Node): boolean => {
  const callee = node.type === 'CallExpression' ? child(node, 'callee') : undefined;
  return (
    callee?.type === 'MemberExpression' && callee.computed !== true && nameOf(child(callee, 'property')) === 'pipe'
  );
};

/** The call that constructs the value, `.pipe(...)` stages and wrappers peeled off. */
const constructingCall = (initializer: Node): Node | undefined => {
  let base = unwrap(initializer);
  while (isPipe(base)) {
    const object = child(child(base, 'callee') ?? base, 'object');
    if (!object) {
      break;
    }
    base = unwrap(object);
  }
  return base.type === 'CallExpression' || base.type === 'NewExpression' ? base : undefined;
};

/** A string literal, a template without substitutions, or a call wrapping exactly one of those. */
const stringOf = (node: Node): string | undefined => {
  const value = unwrap(node);
  if (value.type === 'Literal' && typeof value.value === 'string') {
    return value.value;
  }
  if (value.type === 'TemplateLiteral' && childList(value, 'expressions').length === 0) {
    const quasi = childList(value, 'quasis')[0];
    const cooked =
      quasi && typeof quasi.value === 'object' && quasi.value !== null ? Reflect.get(quasi.value, 'cooked') : undefined;
    return typeof cooked === 'string' ? cooked : undefined;
  }
  // `DXN.make('org.dxos.operation.x')`: a constant wrapped in a constructor is how keys are written.
  if (value.type === 'CallExpression') {
    const args = childList(value, 'arguments');
    return args.length === 1 && args[0].type !== 'CallExpression' ? stringOf(args[0]) : undefined;
  }
  return undefined;
};

const keyOf = (property: Node): string | undefined => {
  if (property.computed === true) {
    return undefined;
  }
  const key = child(property, 'key');
  return nameOf(key) ?? (key?.type === 'Literal' && typeof key.value === 'string' ? key.value : undefined);
};

const walkObject = (object: Node, prefix: string, depth: number, out: string[]): void => {
  for (const property of childList(object, 'properties')) {
    const key = property.type === 'Property' ? keyOf(property) : undefined;
    const value = child(property, 'value');
    if (key === undefined || value === undefined || out.length >= MAX_LITERALS) {
      continue;
    }
    const path = prefix === '' ? key : `${prefix}.${key}`;
    const inner = unwrap(value);
    if (inner.type === 'ObjectExpression') {
      if (depth < MAX_DEPTH) {
        walkObject(inner, path, depth + 1, out);
      }
      continue;
    }
    const text = stringOf(value);
    if (text !== undefined && text.length <= MAX_LENGTH) {
      out.push(`${path}=${text}`);
    }
  }
};

/** `path=value` for every string property of the constructing call's object-literal arguments. */
export const literalsOf = (initializer: Node): string[] => {
  const call = constructingCall(initializer);
  if (!call) {
    return [];
  }
  const out: string[] = [];
  for (const argument of childList(call, 'arguments')) {
    const object = unwrap(argument);
    if (object.type === 'ObjectExpression') {
      walkObject(object, '', 1, out);
    }
  }
  return [...new Set(out)];
};
