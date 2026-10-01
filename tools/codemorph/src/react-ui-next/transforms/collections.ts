//
// Copyright 2026 DXOS.org
//

import ts from '@typescript/typescript6';

import { type CodeFile, type Element } from '../code-file.ts';
import { addAttr, attrValue, calleeText, getAttr, meaningfulChildren, removeAttr } from '../jsx.ts';
import { type RuleContext } from './composites.ts';
import { openChange } from './popups.ts';

/**
 * Rules for Next's data-driven collections: Select and Listbox roots take their options as `items`, Menu items take
 * an `item` record, and Select's value is a `string[]` reported through change details.
 */

/** The expression an attribute holds, as source text (a string literal keeps its quotes). */
const attrExpression = (file: CodeFile, attr: ts.JsxAttribute | undefined): string | undefined => {
  const init = attr?.initializer;
  if (!init) {
    return undefined;
  }
  if (ts.isStringLiteral(init)) {
    return init.getText(file.sourceFile);
  }
  return ts.isJsxExpression(init) && init.expression ? init.expression.getText(file.sourceFile) : undefined;
};

/** A label child as an expression: trimmed text as a string literal, or the expression of `{…}`. */
const labelText = (file: CodeFile, child: ts.JsxChild): string | undefined => {
  if (ts.isJsxText(child)) {
    const text = child.text.trim().replace(/\s+/g, ' ');
    return text.includes("'") ? JSON.stringify(text) : `'${text}'`;
  }
  if (ts.isJsxExpression(child) && child.expression) {
    return child.expression.getText(file.sourceFile);
  }
  return undefined;
};

const resolvesTo = (file: CodeFile, node: ts.Node, path: string): boolean => {
  if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) {
    return false;
  }
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  return file.resolve(opening.tagName)?.path.join('.') === path;
};

/** How an item sits under its root: placed statically, or returned by the callback of one `.map` call. */
type Placement = { kind: 'static' } | { kind: 'map'; receiver: ts.Expression; callback: ts.ArrowFunction };

/** Where the item sits relative to `root`, or undefined when it is nested in anything but JSX and one `.map`. */
const placement = (file: CodeFile, item: ts.Node, root: ts.Node, rootPath: string): Placement | undefined => {
  let result: Placement = { kind: 'static' };
  let node = item;
  while (node.parent && node.parent !== root) {
    const parent = node.parent;
    if (ts.isJsxElement(parent) || ts.isJsxFragment(parent)) {
      if (resolvesTo(file, parent, rootPath)) {
        return undefined;
      }
    } else if (ts.isJsxOpeningElement(parent) || ts.isJsxAttributes(parent)) {
      return undefined;
    } else if (ts.isParenthesizedExpression(parent)) {
      // Transparent.
    } else if (ts.isArrowFunction(parent) && parent.body === node && result.kind === 'static') {
      const call = parent.parent;
      if (
        !ts.isCallExpression(call) ||
        !ts.isPropertyAccessExpression(call.expression) ||
        call.expression.name.text !== 'map' ||
        call.arguments[0] !== parent ||
        !ts.isJsxExpression(call.parent)
      ) {
        return undefined;
      }
      result = { kind: 'map', receiver: call.expression.expression, callback: parent };
      node = call.parent;
      continue;
    } else if (!ts.isJsxExpression(parent) || result.kind === 'static') {
      return undefined;
    }
    node = parent;
  }
  return result;
};

/**
 * Adds `items` to a collection root, built from its `Item` descendants: an array literal when they are placed
 * statically, or the same `.map` when one call renders all of them.
 */
const rootItems = (
  { file, element }: RuleContext,
  part: string,
  option: (item: Element) => string | undefined,
  legacy: string[] = [],
): void => {
  if (getAttr(element, 'items')) {
    return;
  }
  const rootPath = `${part}.Root`;
  const end = element.node.getEnd();
  const start = element.node.getStart(file.sourceFile);
  const items = file
    .elements()
    .filter(
      (candidate) =>
        [`${part}.Item`, ...legacy].includes(candidate.identity.path.join('.')) &&
        candidate.node.getStart(file.sourceFile) > start &&
        candidate.node.getEnd() <= end,
    );
  const fail = (reason: string) => file.report(element.opening, `${rootPath} items: ${reason}`);
  if (items.length === 0) {
    fail('no Item inside; pass the options as items by hand');
    return;
  }
  const placed = items.map((item) => ({ item, placement: placement(file, item.node, element.node, rootPath) }));
  const values = placed.map(({ item }) => option(item));
  if (placed.some(({ placement }) => !placement) || values.some((value) => !value)) {
    fail('an Item is conditional, computed or has no derivable value and label; pass the options by hand');
    return;
  }
  const maps = placed.flatMap(({ placement }) => (placement?.kind === 'map' ? [placement] : []));
  if (maps.length === 0) {
    addAttr(file, element, `items={[${values.join(', ')}]}`);
  } else if (maps.length === 1 && placed.length === 1) {
    const { callback } = maps[0];
    const receiver = maps[0].receiver.getText(file.sourceFile);
    const params = callback.parameters.map((param) => param.getText(file.sourceFile)).join(', ');
    addAttr(file, element, `items={${receiver}.map((${params}) => (${values[0]}))}`);
  } else {
    fail('Items are rendered by several expressions; pass the options by hand');
    return;
  }
  file.count(`${rootPath} items from its Items`);
};

/** `<Select.Item item={…} />` is the option; a `Select.Option` the same run converts gives its value and label. */
const selectOption = (file: CodeFile) => (item: Element) => {
  if (item.identity.path.join('.') === 'Select.Item') {
    return attrExpression(file, getAttr(item, 'item'));
  }
  const value = attrExpression(file, getAttr(item, 'value'));
  const children = meaningfulChildren(item);
  const label = children.length === 0 ? value : children.length === 1 ? labelText(file, children[0]) : undefined;
  return value && label ? `{ value: ${value}, label: ${label} }` : undefined;
};

/** `<Listbox.Item id={…}><Listbox.ItemText>label</Listbox.ItemText></Listbox.Item>`: `{ value: id, label }`. */
const listboxOption = (file: CodeFile) => (item: Element) => {
  const id = attrExpression(file, getAttr(item, 'id'));
  if (!id) {
    return undefined;
  }
  const text = meaningfulChildren(item).find((child) => resolvesTo(file, child, 'Listbox.ItemText'));
  const children =
    text && ts.isJsxElement(text)
      ? text.children.filter((child) => !(ts.isJsxText(child) && child.containsOnlyTriviaWhiteSpaces))
      : [];
  const label = children.length === 1 ? labelText(file, children[0]) : undefined;
  return `{ value: ${id}, label: ${label ?? id} }`;
};

/** Ark reports Select changes as details; a single-select handler takes the first value. */
const selectValue = ({ file, element }: RuleContext) => {
  const multiple = getAttr(element, 'multiple');
  if (multiple) {
    const value = attrValue(multiple);
    if (value.kind !== 'boolean' || value.value) {
      file.report(multiple, 'Select multiple: map value and onValueChange (string[], change details) by hand');
      return;
    }
  }
  for (const name of ['value', 'defaultValue']) {
    const attr = getAttr(element, name);
    const init = attr?.initializer;
    if (!attr || !init) {
      continue;
    }
    const expression = ts.isJsxExpression(init) ? init.expression : init;
    if (!expression || ts.isArrayLiteralExpression(expression)) {
      continue;
    }
    file.replace(init, `{[${expression.getText(file.sourceFile)}]}`);
    file.count(`Select.Root ${name} → [${name}]`);
  }
  const handler = getAttr(element, 'onValueChange');
  const init = handler?.initializer;
  const expression = init && ts.isJsxExpression(init) ? init.expression : undefined;
  if (!handler || !expression) {
    return;
  }
  if (ts.isArrowFunction(expression)) {
    const [param] = expression.parameters;
    if (!param || ts.isObjectBindingPattern(param.name) || expression.parameters.length > 1) {
      return;
    }
    if (!ts.isIdentifier(param.name)) {
      file.report(handler, 'Select onValueChange takes details ({ value: string[] }); map the parameter by hand');
      return;
    }
    const replacement = `({ value: [${param.name.text}] })`;
    const open = expression.getStart(file.sourceFile);
    if (file.text[open] === '(') {
      file.edit(open, file.text.indexOf(')', expression.parameters.end) + 1, replacement);
    } else {
      file.replace(param, replacement);
    }
    file.count('Select.Root onValueChange(value) → ({ value: [value] })');
  } else {
    file.replace(expression, `({ value: [value] }) => ${calleeText(file, expression)}(value)`);
    file.count('Select.Root onValueChange={fn} → ({ value: [value] }) => fn(value)');
  }
};

/** Select.Root: `items` from its Items, and the string[] value model. */
export const selectRoot = (ctx: RuleContext) => {
  // A root that already takes `items` is written against Next, value model included.
  if (getAttr(ctx.element, 'items')) {
    return;
  }
  openChange(ctx);
  rootItems(ctx, 'Select', selectOption(ctx.file), ['Select.Option']);
  selectValue(ctx);
};

/** Listbox.Root (react-ui-list/next): `items` from its Items' ids and ItemText labels. */
export const listboxRoot = (ctx: RuleContext) => rootItems(ctx, 'Listbox', listboxOption(ctx.file));

/**
 * `<Menu.Item><Icon icon='…' />Label</Menu.Item>` → `<Menu.Item item={{ value, label, icon }} />`: the default row
 * renders the same icon and label. The value is the item's `value`, else its `key`, else its label.
 */
export const menuItem = ({ file, element }: RuleContext) => {
  if (getAttr(element, 'item')) {
    return;
  }
  const part = element.identity.path.join('.');
  const fail = (reason: string) => file.report(element.opening, `${part} takes item data: ${reason}`);
  const children = meaningfulChildren(element);
  let icon: string | undefined;
  let rest = children;
  const [first] = children;
  if (first && ts.isJsxSelfClosingElement(first) && file.resolve(first.tagName)?.path.join('.') === 'Icon') {
    const attrs = first.attributes.properties;
    const iconAttr = attrs.find((prop) => ts.isJsxAttribute(prop) && prop.name.getText(file.sourceFile) === 'icon');
    icon = iconAttr && ts.isJsxAttribute(iconAttr) ? attrExpression(file, iconAttr) : undefined;
    const extra = attrs.filter(
      (prop) => !ts.isJsxAttribute(prop) || !['icon', 'size'].includes(prop.name.getText(file.sourceFile)),
    );
    if (!icon || extra.length > 0) {
      fail('its Icon carries props other than icon; compose ItemIcon by hand');
      return;
    }
    rest = children.slice(1);
  }
  const label = rest.length === 1 ? labelText(file, rest[0]) : undefined;
  if (!label) {
    fail('its label is not one text or expression; compose the row by hand');
    return;
  }
  const valueAttr = getAttr(element, 'value');
  const value = attrExpression(file, valueAttr) ?? attrExpression(file, getAttr(element, 'key')) ?? label;
  if (valueAttr) {
    removeAttr(file, valueAttr);
  }
  const record = [`value: ${value}`, `label: ${label}`, ...(icon ? [`icon: ${icon}`] : [])].join(', ');
  addAttr(file, element, `item={{ ${record} }}`);
  if (ts.isJsxElement(element.node)) {
    file.edit(element.node.openingElement.getEnd() - 1, element.node.getEnd(), ' />');
    for (const child of children) {
      if (ts.isJsxSelfClosingElement(child)) {
        file.release(child.tagName.getText(file.sourceFile).split('.')[0]);
      }
    }
  }
  file.claim(element.node);
  file.count(`${part} children → item={…}`);
};
