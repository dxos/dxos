//
// Copyright 2026 DXOS.org
//

import ts from '@typescript/typescript6';

import { type Element } from '../code-file.ts';
import { addAttr, attrValue, calleeText, getAttr, removeAttr, renameAttr } from '../jsx.ts';
import { type RuleContext } from './composites.ts';

/**
 * Rules for the Radix → Ark popup model: open-state callbacks receive change details, and placement moves from the
 * Content part to the Root's `positioning`.
 */

/** `onOpenChange={(open) => …}` → `({ open }) => …`; a handler reference is called with `open`. */
export const openChange = ({ file, element }: RuleContext) => {
  const handler = getAttr(element, 'onOpenChange');
  const init = handler?.initializer;
  const expression = init && ts.isJsxExpression(init) ? init.expression : undefined;
  if (!handler || !expression) {
    return;
  }
  const part = element.identity.path.join('.');
  if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) {
    const [param] = expression.parameters;
    if (!param || expression.parameters.length > 1 || ts.isObjectBindingPattern(param.name)) {
      return;
    }
    if (!ts.isIdentifier(param.name)) {
      file.report(handler, `${part} onOpenChange takes details ({ open }); map the parameter by hand`);
      return;
    }
    const name = param.name.text;
    const replacement = name === 'open' ? '({ open })' : `({ open: ${name} })`;
    const open = expression.parameters.pos - 1;
    if (file.text[open] === '(') {
      file.edit(open, file.text.indexOf(')', expression.parameters.end) + 1, replacement);
    } else {
      file.replace(param, replacement);
    }
  } else {
    file.replace(expression, `({ open }) => ${calleeText(file, expression)}(open)`);
  }
  file.count(`${part} onOpenChange(open) → ({ open })`);
};

const PLACEMENT_PROPS = ['side', 'align', 'sideOffset', 'collisionPadding'];

/** The nearest ancestor element that is `<root>` of the same package. */
const findRoot = ({ file, element }: RuleContext, root: string): Element | undefined => {
  for (let node: ts.Node | undefined = element.node.parent; node; node = node.parent) {
    if (ts.isJsxElement(node)) {
      const identity = file.resolve(node.openingElement.tagName);
      if (identity?.pkg === element.identity.pkg && identity.path.join('.') === root) {
        return { node, opening: node.openingElement, closing: node.closingElement, identity };
      }
    }
  }
  return undefined;
};

/**
 * `<X.Content side='top' align='start' sideOffset={4}>` → `<X.Root positioning={{ placement: 'top-start', gutter: 4 }}>`:
 * Ark places the popup from the Root. Only literal values move; anything else is reported.
 */
export const contentPlacement = (ctx: RuleContext) => {
  const { file, element } = ctx;
  const attrs = PLACEMENT_PROPS.flatMap((name) => {
    const attr = getAttr(element, name);
    return attr ? [{ name, attr, value: attrValue(attr) }] : [];
  });
  if (attrs.length === 0) {
    return;
  }
  const [popup] = element.identity.path;
  const part = element.identity.path.join('.');
  const root = findRoot(ctx, `${popup}.Root`);
  const literal = attrs.every(({ value }) => value.kind === 'string' || value.kind === 'number');
  if (!root || getAttr(root, 'positioning') || !literal) {
    file.report(
      element.opening,
      `${part} ${attrs.map(({ name }) => name).join('/')} → ${popup}.Root positioning ({ placement, gutter, overflowPadding }) by hand`,
    );
    return;
  }
  const text = (name: string) => {
    const value = attrs.find((attr) => attr.name === name)?.value;
    return value?.kind === 'string' ? value.value : value?.kind === 'number' ? String(value.value) : undefined;
  };
  const side = text('side') ?? 'bottom';
  const align = text('align');
  const fields = [];
  if (text('side') !== undefined || text('align') !== undefined) {
    fields.push(`placement: '${align && align !== 'center' ? `${side}-${align}` : side}'`);
  }
  if (text('sideOffset') !== undefined) {
    fields.push(`gutter: ${text('sideOffset')}`);
  }
  if (text('collisionPadding') !== undefined) {
    fields.push(`overflowPadding: ${text('collisionPadding')}`);
  }
  for (const { attr } of attrs) {
    removeAttr(file, attr);
  }
  addAttr(file, root, `positioning={{ ${fields.join(', ')} }}`);
  file.count(`${part} placement → ${popup}.Root positioning`);
};

/** `Card.Block end` → `Block rail='end'`: the trailing slot is the end rail. */
export const blockEnd = ({ file, element }: RuleContext) => {
  const end = getAttr(element, 'end');
  if (!end) {
    return;
  }
  const value = attrValue(end);
  if (value.kind === 'true' || (value.kind === 'boolean' && value.value)) {
    file.replace(end, "rail='end'");
    file.count("Block end → rail='end'");
  } else if (value.kind === 'boolean') {
    removeAttr(file, end);
  } else {
    renameAttr(file, end, 'rail');
    file.report(end, "Block end is computed; rail takes 'start' | 'end'");
  }
};
