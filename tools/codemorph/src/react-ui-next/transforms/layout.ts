//
// Copyright 2026 DXOS.org
//

import ts from '@typescript/typescript6';

import { type CodeFile, type Element } from '../code-file.ts';
import { addAttr, attrName, attrText, attrValue, getAttr, meaningfulChildren, removeAttr, unwrap } from '../jsx.ts';
import { type Transform } from './transform.ts';

/**
 * Child classes whose effect depends on the parent being a flex box (or a Column track), so a grid parent changes them.
 * A child carrying one keeps its parent a residue item.
 */
const LAYOUT_DEPENDENT =
  /^(flex-(1|auto|initial|none|grow|shrink|\[)|grow|shrink|basis-|self-|order-|col-|row-|h-full|min-h-0|max-h-full|dx-(expand|grow|fill))/;

/** Flex gap steps (4/8/12px) → Container row gaps (0.25/0.5/0.75rem); larger steps have no Container gap. */
const FLEX_GAPS: Record<string, string> = { none: 'none', xs: 'sm', sm: 'md', md: 'lg' };

/** Attributes that only shape the Flex box itself; every other attribute carries over to the Container. */
const FLEX_PROPS = new Set(['column', 'gap', 'align', 'justify', 'wrap', 'grow', 'center', 'asChild']);

/** Attributes the Container cannot take as they are. */
const BLOCKING = new Set(['classNames', 'className', 'style', 'asChild']);

const literalTokens = (node: ts.Node): string[] | undefined => {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text.split(/\s+/).filter(Boolean);
  }
  if (ts.isJsxExpression(node)) {
    return node.expression ? literalTokens(node.expression) : [];
  }
  if (ts.isArrayLiteralExpression(node) || ts.isCallExpression(node)) {
    const args = ts.isCallExpression(node) ? node.arguments : node.elements;
    const parts = args.map(literalTokens);
    return parts.every((part) => part !== undefined) ? parts.flat() : undefined;
  }
  return undefined;
};

/** Why a JSX child would lay out differently under a grid parent, or undefined when it would not. */
const childProblem = (child: ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment): string | undefined => {
  if (ts.isJsxFragment(child)) {
    return child.children.map(childNodeProblem).find(Boolean);
  }
  const opening = ts.isJsxElement(child) ? child.openingElement : child;
  for (const prop of opening.attributes.properties) {
    if (ts.isJsxSpreadAttribute(prop)) {
      return 'a child spreads props';
    }
    const name = attrName(prop);
    if (name === 'grow') {
      return 'a child grows';
    }
    if ((name === 'classNames' || name === 'className') && prop.initializer) {
      const tokens = literalTokens(prop.initializer);
      if (!tokens) {
        return 'a child has computed classes';
      }
      const token = tokens.find((candidate) => LAYOUT_DEPENDENT.test(candidate.replace(/^.*:/, '')));
      if (token) {
        return `a child has ${token}`;
      }
    }
  }
  return undefined;
};

const childNodeProblem = (child: ts.JsxChild): string | undefined => {
  if (ts.isJsxText(child)) {
    return undefined;
  }
  if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) {
    return childProblem(child);
  }
  if (ts.isJsxExpression(child)) {
    if (!child.expression) {
      return undefined;
    }
    // Only JSX written in the expression can be checked; a passed-through value (`{children}`) could be anything.
    const found: (ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment)[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
        found.push(node);
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(child.expression);
    return found.length === 0 ? 'a child is a computed value' : found.map(childProblem).find(Boolean);
  }
  return undefined;
};

const childrenProblem = (element: Element) => meaningfulChildren(element).map(childNodeProblem).find(Boolean);

/** Replaces the element's tag with `Next.Container`, releasing its current root binding. */
const toContainer = (file: CodeFile, element: Element) => {
  const tag = file.nameFor('react-ui', 'next', ['Container']);
  file.replace(element.opening.tagName, tag);
  if (element.closing) {
    file.replace(element.closing.tagName, tag);
  }
  file.release(element.identity.binding.local, element.closing ? 2 : 1);
};

/** `<Flex column gap>` with static props and grid-safe children → `<Next.Container gutter='none' gap>`. */
const flex = (file: CodeFile, element: Element) => {
  const fail = (reason: string) => file.report(element.opening, `Flex not converted: ${reason}`);
  const props = element.opening.attributes.properties;
  if (props.some(ts.isJsxSpreadAttribute)) {
    return fail('spread props');
  }
  const blocking = props
    .filter(ts.isJsxAttribute)
    .map(attrName)
    .find((name) => BLOCKING.has(name));
  if (blocking) {
    return fail(`${blocking} (layout classes need a person)`);
  }
  const column = getAttr(element, 'column');
  const columnValue = column ? attrValue(column) : undefined;
  if (!column || !(columnValue?.kind === 'true' || (columnValue?.kind === 'boolean' && columnValue.value))) {
    return fail('a row (Group pads and wraps, a Container row needs columns)');
  }
  const value = (name: string) => {
    const attr = getAttr(element, name);
    const result = attr ? attrValue(attr) : undefined;
    return {
      attr,
      value: result?.kind === 'string' ? result.value : undefined,
      dynamic: !!attr && result?.kind !== 'string',
    };
  };
  const gap = value('gap');
  const align = value('align');
  const justify = value('justify');
  if (gap.dynamic || align.dynamic || justify.dynamic) {
    return fail('a computed layout prop');
  }
  if ((align.attr && align.value !== 'stretch') || (justify.attr && justify.value !== 'start')) {
    return fail('align or justify other than the grid default');
  }
  if (getAttr(element, 'wrap') || getAttr(element, 'grow') || getAttr(element, 'center')) {
    return fail('wrap, grow or center');
  }
  if (gap.value && !FLEX_GAPS[gap.value]) {
    return fail(`gap='${gap.value}' has no Container step`);
  }
  const problem = childrenProblem(element);
  if (problem) {
    return fail(problem);
  }

  toContainer(file, element);
  for (const name of FLEX_PROPS) {
    const attr = getAttr(element, name);
    if (attr && attr !== gap.attr) {
      removeAttr(file, attr);
    }
  }
  if (gap.attr && gap.value) {
    file.replace(gap.attr, attrText('gap', FLEX_GAPS[gap.value]));
  }
  addAttr(file, element, "gutter='none'");
  file.count("Flex column → Next.Container gutter='none'");
};

const COLUMN_GUTTERS = new Set(['sm', 'md', 'lg']);

/** `Column.Root` whose children are all `Column.Center`/`Row` → a gutter `Next.Container`; returns whether it converted. */
const columnRoot = (file: CodeFile, element: Element): boolean => {
  const fail = (reason: string) => {
    file.report(element.opening, `Column.Root not converted: ${reason}`);
    return false;
  };
  const props = element.opening.attributes.properties;
  if (props.some(ts.isJsxSpreadAttribute)) {
    return fail('spread props');
  }
  const blocking = props
    .filter(ts.isJsxAttribute)
    .map(attrName)
    .find((name) => BLOCKING.has(name));
  if (blocking) {
    return fail(`${blocking} (layout classes need a person)`);
  }
  const gutter = getAttr(element, 'gutter');
  const gutterValue = gutter ? attrValue(gutter) : undefined;
  const gap = getAttr(element, 'gap');
  const gapValue = gap ? attrValue(gap) : undefined;
  if (
    (gutter && (gutterValue?.kind !== 'string' || !COLUMN_GUTTERS.has(gutterValue.value))) ||
    (gap && (gapValue?.kind !== 'string' || !COLUMN_GUTTERS.has(gapValue.value)))
  ) {
    return fail('a computed gutter or gap');
  }
  const stray = meaningfulChildren(element).find((child) => {
    const opening = ts.isJsxElement(child)
      ? child.openingElement
      : ts.isJsxSelfClosingElement(child)
        ? child
        : undefined;
    const identity = opening ? file.resolve(opening.tagName) : undefined;
    const key = identity?.pkg === 'react-ui' ? identity.path.join('.') : undefined;
    return !(key === 'Column.Center' || key === 'Column.Row' || (ts.isJsxExpression(child) && !child.expression));
  });
  if (stray) {
    return fail('a child other than Column.Center / Column.Row (Column places it in a gutter track)');
  }

  toContainer(file, element);
  const subgrid = getAttr(element, 'subgrid');
  const role = getAttr(element, 'role');
  const roleValue = role ? attrValue(role) : undefined;
  const defaultRole = roleValue?.kind === 'string' && roleValue.value === 'none' ? role : undefined;
  for (const attr of [subgrid, defaultRole, gutter].filter((attr) => attr !== undefined)) {
    removeAttr(file, attr);
  }
  const gutterText = subgrid ? 'inherit' : gutterValue?.kind === 'string' ? gutterValue.value : 'lg';
  addAttr(file, element, attrText('gutter', gutterText));
  file.count('Column.Root → Next.Container');
  return true;
};

/** A `Column.Center` under a converted root: Container children already sit in the content track. */
const columnCenter = (file: CodeFile, element: Element) => {
  const attrs = element.opening.attributes.properties;
  const children = meaningfulChildren(element);
  const onlyElement =
    children.length === 1 && (ts.isJsxElement(children[0]) || ts.isJsxSelfClosingElement(children[0]));
  if (attrs.length === 0 && onlyElement) {
    unwrap(file, element);
    file.release(element.identity.binding.local, element.closing ? 2 : 1);
    file.count('Column.Center unwrapped');
    return;
  }
  const classNames = getAttr(element, 'classNames');
  const classValue = classNames ? attrValue(classNames) : undefined;
  if (attrs.length > (classNames ? 1 : 0) || (classNames && classValue?.kind !== 'string')) {
    file.report(element.opening, 'Column.Center with props: place it in the Container by hand');
    return;
  }
  file.replace(element.opening.tagName, 'div');
  if (element.closing) {
    file.replace(element.closing.tagName, 'div');
  }
  if (classNames) {
    file.replace(classNames.name, 'className');
  }
  file.release(element.identity.binding.local, element.closing ? 2 : 1);
  file.count('Column.Center → div');
};

/** Imports whose elements this transform converts or reports one by one. */
export const LAYOUT_NAMES = new Set(['Flex', 'Column']);

export const layout: Transform = {
  name: 'layout',
  description: 'Unambiguous Flex column and Column.Root/Center → Next.Container; everything else is reported.',
  applies: (text) => text.includes('@dxos/react-ui') && (text.includes('<Flex') || text.includes('<Column.')),
  run: (file) => {
    const converted = new Set<ts.Node>();
    for (const element of file.elements()) {
      if (element.identity.pkg !== 'react-ui' || element.identity.form !== 'current') {
        continue;
      }
      switch (element.identity.path.join('.')) {
        case 'Flex':
          flex(file, element);
          break;
        case 'Column.Root':
          if (columnRoot(file, element)) {
            converted.add(element.node);
          }
          break;
        case 'Column.Center':
          if (converted.has(element.node.parent)) {
            columnCenter(file, element);
          }
          break;
        case 'Column.Row':
          file.report(element.opening, 'Column.Row → a row Container with Block rails, by hand');
          break;
        case 'Column.Section':
          file.report(element.opening, 'Column.Section → an inheriting Container, by hand');
          break;
      }
    }
  },
};
