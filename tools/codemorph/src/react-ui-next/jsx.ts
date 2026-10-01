//
// Copyright 2026 DXOS.org
//

import ts from '@typescript/typescript6';

import { type CodeFile, type Element } from './code-file.ts';
import { lineRange } from './edits.ts';
import { type PackageName } from './targets.ts';

/** An attribute's value, by shape. */
export type AttrValue =
  | { kind: 'true' }
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'expression'; expression: ts.Node };

export const attributes = (element: Element): ts.JsxAttribute[] =>
  element.opening.attributes.properties.filter(ts.isJsxAttribute);

export const attrName = (attr: ts.JsxAttribute): string =>
  ts.isIdentifier(attr.name) ? attr.name.text : `${attr.name.namespace.text}:${attr.name.name.text}`;

export const getAttr = (element: Element, name: string): ts.JsxAttribute | undefined =>
  attributes(element).find((attr) => attrName(attr) === name);

export const attrValue = (attr: ts.JsxAttribute): AttrValue => {
  const init = attr.initializer;
  if (!init) {
    return { kind: 'true' };
  }
  if (ts.isStringLiteral(init)) {
    return { kind: 'string', value: init.text };
  }
  if (ts.isJsxExpression(init) && init.expression) {
    const expression = init.expression;
    if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
      return { kind: 'string', value: expression.text };
    }
    if (ts.isNumericLiteral(expression)) {
      return { kind: 'number', value: Number(expression.text) };
    }
    if (expression.kind === ts.SyntaxKind.TrueKeyword || expression.kind === ts.SyntaxKind.FalseKeyword) {
      return { kind: 'boolean', value: expression.kind === ts.SyntaxKind.TrueKeyword };
    }
    return { kind: 'expression', expression };
  }
  return { kind: 'expression', expression: init };
};

/** Removes an attribute with the whitespace before it. */
export const removeAttr = (file: CodeFile, attr: ts.JsxAttribute) => {
  file.edit(attr.getFullStart(), attr.getEnd(), '');
};

export const renameAttr = (file: CodeFile, attr: ts.JsxAttribute, name: string) => {
  file.replace(attr.name, name);
};

/** Appends an attribute (`name='value'`, `name={…}` or a bare `name`) after the existing ones. */
export const addAttr = (file: CodeFile, element: Element, text: string) => {
  const properties = element.opening.attributes.properties;
  const end = properties.length > 0 ? properties[properties.length - 1].getEnd() : element.opening.tagName.getEnd();
  file.edit(end, end, ` ${text}`);
};

/** `name='value'` for a string, `name={value}` otherwise. */
export const attrText = (name: string, value: string | number | boolean): string =>
  typeof value === 'string' ? `${name}='${value}'` : value === true ? name : `${name}={${value}}`;

/**
 * Renames an element to `path` in `pkg` (by default its own package), keeping the file's spelling.
 * A changed root goes through `CodeFile.nameFor`, which adds the import and releases the old one.
 */
export const renameElement = (
  file: CodeFile,
  element: Element,
  path: string[],
  pkg: PackageName = element.identity.pkg,
) => {
  file.replace(element.opening.tagName, tagText(file, element, path, pkg));
  if (element.closing) {
    file.replace(element.closing.tagName, tagText(file, element, path, pkg, false));
  }
};

/** The tag naming `path` of `pkg` in the element's spelling; releases the old root when it changes. */
export const tagText = (
  file: CodeFile,
  element: Element,
  path: string[],
  pkg: PackageName = element.identity.pkg,
  release = true,
): string => {
  const { identity } = element;
  const tag = element.opening.tagName.getText(file.sourceFile);
  const prefixLength = tag.length - identity.path.join('.').length;
  const prefix = tag.slice(0, prefixLength);
  const sameRoot = pkg === identity.pkg && path[0] === identity.path[0];
  if (prefix.length > 0 && pkg === identity.pkg) {
    return `${prefix}${path.join('.')}`;
  }
  if (prefix.length === 0 && sameRoot) {
    return [identity.binding.local, ...path.slice(1)].join('.');
  }
  if (release) {
    file.release(identity.binding.local, element.closing ? 2 : 1);
  }
  return file.nameFor(pkg, identity.form, path);
};

/** The children that matter: everything but whitespace-only text. */
export const meaningfulChildren = (element: Element): ts.JsxChild[] =>
  ts.isJsxElement(element.node)
    ? element.node.children.filter((child) => !(ts.isJsxText(child) && child.containsOnlyTriviaWhiteSpaces))
    : [];

/** Whether the element sits among JSX children (so unwrapping it splices its children in place). */
export const inJsxChildren = (element: Element) => {
  const parent = element.node.parent;
  return ts.isJsxElement(parent) || ts.isJsxFragment(parent);
};

/**
 * Replaces an element with its children. Outside JSX children, anything but one child element keeps a fragment so the
 * expression stays a single JSX value.
 */
export const unwrap = (file: CodeFile, element: Element) => {
  const { node } = element;
  if (!ts.isJsxElement(node)) {
    if (inJsxChildren(element)) {
      file.remove(node);
    } else {
      file.replace(node, 'null');
    }
    return;
  }
  const children = meaningfulChildren(element);
  const single =
    children.length === 1 &&
    (ts.isJsxElement(children[0]) || ts.isJsxSelfClosingElement(children[0]) || ts.isJsxFragment(children[0]));
  if (!inJsxChildren(element) && !single) {
    file.replace(node.openingElement, '<>');
    file.replace(node.closingElement, '</>');
    return;
  }
  const opening = lineRange(file.text, node.openingElement.getStart(file.sourceFile), node.openingElement.getEnd());
  const closing = lineRange(file.text, node.closingElement.getStart(file.sourceFile), node.closingElement.getEnd());
  file.edit(opening.start, opening.end, '');
  file.edit(closing.start, closing.end, '');
};
