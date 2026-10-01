//
// Copyright 2026 DXOS.org
//

import ts from '@typescript/typescript6';

import { type CodeFile, type Element } from '../code-file.ts';
import {
  addAttr,
  attrName,
  attrText,
  attrValue,
  getAttr,
  inJsxChildren,
  removeAttr,
  renameElement,
  tagText,
} from '../jsx.ts';

/** Context a custom rule gets: the element, plus the file to edit and report on. */
export type RuleContext = { file: CodeFile; element: Element };

const ACTION_ICONS: Record<string, string> = { close: 'ph--x--regular', delete: 'ph--trash--regular' };

const literalAction = (element: Element) => {
  const attr = getAttr(element, 'action');
  const value = attr ? attrValue(attr) : undefined;
  return attr && value?.kind === 'string' && ACTION_ICONS[value.value] ? { attr, action: value.value } : undefined;
};

/** `Dialog.ActionIconButton action='close'` → `SystemButton.Close` (the same icon, label and icon-only ghost button). */
export const dialogActionButton = ({ file, element }: RuleContext) => {
  const found = literalAction(element);
  if (!found) {
    file.report(
      element.opening,
      'Dialog.ActionIconButton with a computed action → SystemButton.Close / .Delete by hand',
    );
    return;
  }
  removeAttr(file, found.attr);
  renameElement(file, element, ['SystemButton', found.action === 'close' ? 'Close' : 'Delete']);
  file.count(`Dialog.ActionIconButton → SystemButton.${found.action === 'close' ? 'Close' : 'Delete'}`);
};

/** `Card.ActionIconButton action label` → `Card.Action icon label`; Card.Action has no default label to fall back on. */
export const cardActionButton = ({ file, element }: RuleContext) => {
  const found = literalAction(element);
  if (!found || !getAttr(element, 'label')) {
    file.report(
      element.opening,
      'Card.ActionIconButton without a label: Card.Action requires one (Next addition: default close/delete labels)',
    );
    return;
  }
  file.replace(found.attr, attrText('icon', ACTION_ICONS[found.action]));
  renameElement(file, element, ['Card', 'Action']);
  file.count('Card.ActionIconButton → Card.Action');
};

/**
 * `<X.VirtualTrigger virtualRef={ref} />` inside `<X.Root>` → `<X.Root positioning={virtualAnchor(ref)}>`: Ark has no
 * virtual trigger part, so the popup is placed by `positioning.getAnchorRect`.
 */
export const virtualTrigger = ({ file, element }: RuleContext) => {
  const { identity } = element;
  const parent = element.node.parent;
  const rootIdentity = ts.isJsxElement(parent) ? file.resolve(parent.openingElement.tagName) : undefined;
  if (
    !ts.isJsxElement(parent) ||
    !rootIdentity ||
    rootIdentity.pkg !== identity.pkg ||
    rootIdentity.path.join('.') !== `${identity.path[0]}.Root`
  ) {
    file.report(
      element.opening,
      'VirtualTrigger is not a direct child of its Root: add positioning={virtualAnchor(ref)} by hand',
    );
    return;
  }
  const ref = getAttr(element, 'virtualRef');
  const others = element.opening.attributes.properties.filter(
    (prop) => !ts.isJsxAttribute(prop) || !['virtualRef', 'key'].includes(attrName(prop)),
  );
  const root: Element = {
    node: parent,
    opening: parent.openingElement,
    closing: parent.closingElement,
    identity: rootIdentity,
  };
  const refInit = ref?.initializer;
  if (
    !refInit ||
    !ts.isJsxExpression(refInit) ||
    !refInit.expression ||
    others.length > 0 ||
    getAttr(root, 'positioning')
  ) {
    file.report(
      element.opening,
      'VirtualTrigger with other props, or a Root that already sets positioning: merge by hand',
    );
    return;
  }
  const anchor = file.nameFor('react-ui', identity.form, ['virtualAnchor']);
  addAttr(file, root, `positioning={${anchor}(${refInit.expression.getText(file.sourceFile)})}`);
  file.remove(element.node);
  file.release(identity.binding.local);
  file.count(`${identity.path.join('.')} → Root positioning={virtualAnchor(ref)}`);
};

const ROW_PARTS = ['icon', 'title', 'description'];

/** Text for a JSX child: a plain string literal inline, anything else in an expression container. */
const childText = (literal: ts.StringLiteral) =>
  /[{}<>]/.test(literal.text) ? `{${literal.getText()}}` : literal.text;

/**
 * `<Listbox.ItemContent icon title description />` → `ItemIcon`, `ItemText`, `ItemDescription` row parts.
 * Expressions are kept in place (only the text around them is rewritten), so edits inside them still apply.
 */
export const listboxItemContent = ({ file, element }: RuleContext) => {
  const fail = (reason: string) => file.report(element.opening, `Listbox.ItemContent: ${reason}`);
  const { node } = element;
  if (!ts.isJsxSelfClosingElement(node)) {
    fail('has children; compose ItemIcon / ItemText / ItemDescription by hand');
    return;
  }
  const attrs = node.attributes.properties;
  const named = attrs.flatMap((prop) => (ts.isJsxAttribute(prop) ? [attrName(prop)] : []));
  const order = named.map((name) => ROW_PARTS.indexOf(name));
  if (named.length !== attrs.length || order.some((index, i) => index === -1 || (i > 0 && index < order[i - 1]))) {
    fail('props other than icon, title, description (in that order); compose the row parts by hand');
    return;
  }
  if (!named.includes('title')) {
    fail('no title');
    return;
  }

  const tag = (part: string) => tagText(file, element, ['Listbox', part]);
  type Segment = { text: string } | { keep: ts.Node };
  const segments: Segment[] = [];
  for (const prop of attrs) {
    if (!ts.isJsxAttribute(prop) || !prop.initializer) {
      fail(`${ts.isJsxAttribute(prop) ? attrName(prop) : 'spread'} has no value`);
      return;
    }
    const name = attrName(prop);
    const init = prop.initializer;
    const expression = ts.isJsxExpression(init) ? init.expression : undefined;
    if (name === 'icon') {
      if (ts.isStringLiteral(init)) {
        segments.push({ text: `<${tag('ItemIcon')} icon=${init.getText(file.sourceFile)} />` });
      } else if (expression && ts.isJsxSelfClosingElement(expression) && isIcon(file, expression)) {
        segments.push({ text: `<${tag('ItemIcon')} ` }, { keep: expression.attributes }, { text: ' />' });
        file.release(expression.tagName.getText(file.sourceFile));
      } else {
        fail('icon is computed or a custom element; pass its props to ItemIcon by hand');
        return;
      }
    } else {
      const part = tag(name === 'title' ? 'ItemText' : 'ItemDescription');
      if (ts.isStringLiteral(init)) {
        segments.push({ text: `<${part}>${childText(init)}</${part}>` });
      } else if (expression) {
        segments.push({ text: `<${part}>{` }, { keep: expression }, { text: `}</${part}>` });
      } else {
        fail(`${name} is empty`);
        return;
      }
    }
  }

  const fragment = !inJsxChildren(element) && named.length > 1;
  let cursor = node.getStart(file.sourceFile);
  let text = fragment ? '<>' : '';
  for (const segment of segments) {
    if ('text' in segment) {
      text += segment.text;
    } else {
      file.edit(cursor, segment.keep.getStart(file.sourceFile), text);
      cursor = segment.keep.getEnd();
      text = '';
    }
  }
  file.edit(cursor, node.getEnd(), text + (fragment ? '</>' : ''));
  file.count('Listbox.ItemContent → ItemIcon / ItemText / ItemDescription');
};

const isIcon = (file: CodeFile, element: ts.JsxSelfClosingElement) => {
  const identity = file.resolve(element.tagName);
  return identity?.pkg === 'react-ui' && identity.path.join('.') === 'Icon';
};
