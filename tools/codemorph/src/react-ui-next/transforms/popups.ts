//
// Copyright 2026 DXOS.org
//

import ts from '@typescript/typescript6';

import { type Element } from '../code-file.ts';
import { addAttr, attrValue, calleeText, getAttr, meaningfulChildren, removeAttr, renameAttr, unwrap } from '../jsx.ts';
import { type RuleContext } from './composites.ts';

/**
 * Rules for the Radix → Ark popup model: open-state callbacks receive change details, and placement moves from the
 * Content part to the Root's `positioning`.
 */

/** `onOpenChange={(open) => …}` → `({ open }) => …`; a handler reference is called with `open`. */
export const openChange = (ctx: RuleContext) => detailsHandler(ctx, 'onOpenChange', 'open');

/**
 * `onCheckedChange={(checked) => …}` → `({ checked }) => …` on Next Checkbox and Switch (Ark reports details). A
 * Checkbox handler reference gets `checked === true`, since Ark's checkbox state may be `'indeterminate'`.
 */
export const checkedChange = (ctx: RuleContext) => {
  const part = ctx.element.identity.path.join('.');
  // The current entry's `Switch` is the flow control, not the form switch.
  if (part === 'Switch' && ctx.element.identity.form !== 'next') {
    return;
  }
  detailsHandler(ctx, 'onCheckedChange', 'checked', part.endsWith('Checkbox') ? ' === true' : '');
};

/** Rewrites a callback prop whose argument became Ark change details carrying `field`. */
const detailsHandler = ({ file, element }: RuleContext, prop: string, field: string, coerce = '') => {
  const handler = getAttr(element, prop);
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
      file.report(handler, `${part} ${prop} takes details ({ ${field} }); map the parameter by hand`);
      return;
    }
    const name = param.name.text;
    const replacement = name === field ? `({ ${field} })` : `({ ${field}: ${name} })`;
    const open = expression.parameters.pos - 1;
    if (file.text[open] === '(') {
      file.edit(open, file.text.indexOf(')', expression.parameters.end) + 1, replacement);
    } else {
      file.replace(param, replacement);
    }
  } else {
    file.replace(expression, `({ ${field} }) => ${calleeText(file, expression)}(${field}${coerce})`);
  }
  file.count(`${part} ${prop}(${field}) → ({ ${field} })`);
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
  contentAutoFocus(ctx);
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

/** `onOpenAutoFocus={(event) => event.preventDefault()}` on Popover.Content → Root `autoFocus={false}` (Ark). */
const contentAutoFocus = (ctx: RuleContext) => {
  const { file, element } = ctx;
  const handler = getAttr(element, 'onOpenAutoFocus');
  if (!handler) {
    return;
  }
  const [popup] = element.identity.path;
  const init = handler.initializer;
  const expression = init && ts.isJsxExpression(init) ? init.expression : undefined;
  const root = popup === 'Popover' ? findRoot(ctx, 'Popover.Root') : undefined;
  const prevents =
    expression &&
    ts.isArrowFunction(expression) &&
    expression.parameters.length === 1 &&
    ts.isIdentifier(expression.parameters[0].name) &&
    expression.body.getText(file.sourceFile).replace(/[\s{};]/g, '') ===
      `${expression.parameters[0].name.text}.preventDefault()`;
  if (!root || !prevents || getAttr(root, 'autoFocus')) {
    file.report(
      handler,
      `${popup}.Content onOpenAutoFocus has no Ark counterpart on Content: use Root autoFocus or initialFocusEl by hand`,
    );
    return;
  }
  removeAttr(file, handler);
  addAttr(file, root, 'autoFocus={false}');
  file.count('Popover.Content onOpenAutoFocus preventDefault → Root autoFocus={false}');
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

/**
 * `<Button asChild><Select.Trigger /></Button>` → `<Select.Trigger />`: a Next popup Trigger is itself a Button, and
 * Next.Button takes no `asChild`.
 */
export const buttonAroundTrigger = ({ file, element }: RuleContext) => {
  const asChild = getAttr(element, 'asChild');
  if (!asChild) {
    return;
  }
  const children = meaningfulChildren(element);
  const [child] = children;
  const childIdentity =
    children.length === 1 && child && (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child))
      ? file.resolve(ts.isJsxElement(child) ? child.openingElement.tagName : child.tagName)
      : undefined;
  const others = element.opening.attributes.properties.filter((prop) => prop !== asChild);
  if (childIdentity?.pkg !== 'react-ui' || childIdentity.path.at(-1) !== 'Trigger' || others.length > 0) {
    file.report(asChild, 'Next.Button takes no asChild: use the child (a Trigger is a Button) or Link asChild by hand');
    return;
  }
  unwrap(file, element);
  file.release(element.identity.binding.local, element.closing ? 2 : 1);
  file.count('Button asChild around a Trigger unwrapped');
};

/**
 * `<Button title='Zoom'><Icon icon='…' /></Button>` → `<Button icon='…' label='Zoom' iconOnly />`: Next.Button takes no
 * `title` (an icon-only button names itself with `label` and shows it in a Tooltip).
 */
export const buttonTitleIcon = ({ file, element }: RuleContext) => {
  const title = getAttr(element, 'title');
  if (!title || getAttr(element, 'label') || getAttr(element, 'icon')) {
    return;
  }
  const children = meaningfulChildren(element);
  const [first] = children;
  const child =
    children.length === 1 &&
    first &&
    ts.isJsxSelfClosingElement(first) &&
    file.resolve(first.tagName)?.path.join('.') === 'Icon'
      ? first
      : undefined;
  const attrNamed = (name: string) =>
    child?.attributes.properties.find((prop) => ts.isJsxAttribute(prop) && prop.name.getText(file.sourceFile) === name);
  const icon = attrNamed('icon');
  const others =
    child?.attributes.properties.filter(
      (prop) => !ts.isJsxAttribute(prop) || !['icon', 'size'].includes(prop.name.getText(file.sourceFile)),
    ) ?? [];
  if (
    !child ||
    !icon ||
    !ts.isJsxAttribute(icon) ||
    !icon.initializer ||
    others.length > 0 ||
    !ts.isJsxElement(element.node)
  ) {
    file.report(title, 'Next.Button takes no title: an icon-only button names itself with label');
    return;
  }
  file.replace(title, `label=${title.initializer?.getText(file.sourceFile) ?? "''"}`);
  addAttr(file, element, `icon=${icon.initializer.getText(file.sourceFile)} iconOnly`);
  file.edit(element.node.openingElement.getEnd() - 1, element.node.getEnd(), ' />');
  file.release(child.tagName.getText(file.sourceFile).split('.')[0]);
  file.claim(element.node);
  file.count('Button title + Icon child → icon label iconOnly');
};

/**
 * `<AlertDialog.Cancel asChild><Button …>Label</Button></AlertDialog.Cancel>` → `<AlertDialog.Cancel …>Label</…>`:
 * Next's Cancel and Action are Buttons themselves, so the wrapped Button's props and label move onto the part.
 */
export const buttonPartAroundButton = ({ file, element }: RuleContext) => {
  const asChild = getAttr(element, 'asChild');
  if (!asChild || !ts.isJsxElement(element.node)) {
    return;
  }
  const children = meaningfulChildren(element).filter((child) => !(ts.isJsxExpression(child) && !child.expression));
  const [child] = children;
  const opening =
    child && ts.isJsxElement(child)
      ? child.openingElement
      : child && ts.isJsxSelfClosingElement(child)
        ? child
        : undefined;
  const identity = opening ? file.resolve(opening.tagName) : undefined;
  const others = element.opening.attributes.properties.filter((prop) => prop !== asChild);
  if (children.length !== 1 || !opening || identity?.path.join('.') !== 'Button' || others.length > 0) {
    file.report(asChild, `${element.identity.path.join('.')} is a Button: move the child's props onto it by hand`);
    return;
  }
  const tag = element.opening.tagName.getText(file.sourceFile);
  const attrs = opening.attributes.getText(file.sourceFile);
  const inner =
    child && ts.isJsxElement(child)
      ? file.text.slice(child.openingElement.getEnd(), child.closingElement.getStart(file.sourceFile))
      : '';
  file.replace(element.node, inner ? `<${tag} ${attrs}>${inner}</${tag}>` : `<${tag} ${attrs} />`);
  file.release(opening.tagName.getText(file.sourceFile).split('.')[0], child && ts.isJsxElement(child) ? 2 : 1);
  file.claim(element.node);
  file.count(`${element.identity.path.join('.')} asChild around a Button merged`);
};
