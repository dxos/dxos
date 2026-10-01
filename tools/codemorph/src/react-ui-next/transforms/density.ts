//
// Copyright 2026 DXOS.org
//

import ts from '@typescript/typescript6';

import { type CodeFile, type Element } from '../code-file.ts';
import { addAttr, attrText, attrValue, getAttr, removeAttr, renameAttr } from '../jsx.ts';

/** Button-like elements: in Next they take `size` themselves (Button `size`, so Toggle and `ToggleGroup.Item`). */
const BUTTONS = new Set([
  'Button',
  'IconButton',
  'Toggle',
  'ToggleGroupItem',
  'ToggleGroupIconItem',
  'Toolbar.Button',
  'Toolbar.IconButton',
  'Toolbar.ToggleGroupItem',
  'Toolbar.ToggleGroupIconItem',
  'OrderedList.IconButton',
]);

export const isButton = (key: string) => BUTTONS.has(key) || key.startsWith('SystemIconButton.');

/** react-ui parts whose Next counterpart sets `data-size` for its subtree, so a shared button size can move there. */
const SCOPES = new Set([
  'Toolbar.Root',
  'Panel.Root',
  'Card.Root',
  'Container',
  'Dialog.Content',
  'Popover.Content',
  'Menu.Content',
  'Select.Content',
  'Tabs.Root',
  'Field.Root',
  'Fieldset.Root',
  'ScrollArea.Root',
]);

/** Every density of the current theme names a Next size; `md` is the default of both when nothing sets one. */
const SIZES = new Set(['sm', 'md', 'lg']);

type JsxParent = ts.JsxElement | ts.JsxSelfClosingElement;

/**
 * Enclosing JSX elements, nearest first, up to the component that renders them.
 * A function nested inside JSX (a `.map` callback) does not end the walk; any other function does, since its caller,
 * possibly in another file, decides the scope.
 */
const enclosing = (node: ts.Node): { chain: JsxParent[]; crossesBoundary: boolean } => {
  const chain: JsxParent[] = [];
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isJsxElement(current)) {
      chain.push(current);
    } else if (ts.isFunctionLike(current) && !hasJsxAncestor(current)) {
      return { chain, crossesBoundary: true };
    }
  }
  return { chain, crossesBoundary: false };
};

const hasJsxAncestor = (node: ts.Node): boolean => {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isJsxElement(current) || ts.isJsxFragment(current)) {
      return true;
    }
    if (ts.isFunctionLike(current)) {
      return false;
    }
  }
  return false;
};

const asElement = (file: CodeFile, node: JsxParent): Element | undefined => {
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  const identity = file.resolve(opening.tagName);
  return identity
    ? { node, opening, closing: ts.isJsxElement(node) ? node.closingElement : undefined, identity }
    : undefined;
};

/** The size an element sets for its subtree: a literal, `computed`, or undefined when it sets none. */
const sizeOf = (node: JsxParent): string | 'computed' | undefined => {
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  for (const prop of opening.attributes.properties) {
    if (ts.isJsxAttribute(prop) && ts.isIdentifier(prop.name) && ['density', 'size'].includes(prop.name.text)) {
      const value = attrValue(prop);
      return value.kind === 'string' ? value.value : 'computed';
    }
  }
  return undefined;
};

type Hoist = { size: string } | undefined;

/** One decision per scope element and file: whether its buttons' shared density moves onto it. */
const hoists = new WeakMap<CodeFile, Map<ts.Node, Hoist>>();

/** Buttons whose nearest sizing ancestor is `scope` and which no nearer element sizes. */
const buttonsIn = (file: CodeFile, scope: ts.JsxElement): Element[] => {
  const result: Element[] = [];
  const visit = (node: ts.Node) => {
    if (node !== scope && (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node))) {
      const element = asElement(file, node);
      const key = element && element.identity.pkg !== 'react-ui-form' ? element.identity.path.join('.') : undefined;
      if (element && key && isButton(key)) {
        result.push(element);
      } else if (sizeOf(node) !== undefined || (element?.identity.pkg === 'react-ui' && key && SCOPES.has(key))) {
        // A nearer scope decides the buttons under it.
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(scope);
  return result;
};

const hoistFor = (file: CodeFile, scope: Element & { node: ts.JsxElement }): Hoist => {
  const byFile = hoists.get(file) ?? new Map<ts.Node, Hoist>();
  hoists.set(file, byFile);
  if (byFile.has(scope.node)) {
    return byFile.get(scope.node);
  }
  const densities = buttonsIn(file, scope.node).map((button) => {
    const attr = getAttr(button, 'density');
    const value = attr ? attrValue(attr) : undefined;
    return value?.kind === 'string' ? value.value : attr ? 'computed' : 'none';
  });
  const [first] = densities;
  const hoist =
    first && SIZES.has(first) && densities.every((density) => density === first) ? { size: first } : undefined;
  if (hoist) {
    addAttr(file, scope, attrText('size', hoist.size));
    file.count(`button density hoisted to ${scope.identity.path.join('.')} size`);
  }
  byFile.set(scope.node, hoist);
  return hoist;
};

/**
 * Button `density` (AUDIT "Decision review (follow-ups)", Button `size`): dropped where the enclosing scope already
 * yields it, hoisted to the nearest scope element when every button there shares it, otherwise `size` on the button.
 */
export const buttonDensity = (file: CodeFile, element: Element) => {
  const attr = getAttr(element, 'density');
  if (!attr) {
    return;
  }
  const value = attrValue(attr);
  const density = value.kind === 'string' ? value.value : undefined;
  const toSize = (reason?: string) => {
    renameAttr(file, attr, 'size');
    file.count('button density → size');
    if (reason) {
      file.report(attr, reason);
    }
  };
  if (!density || !SIZES.has(density)) {
    toSize('button density with a computed value renamed to size; check it is xs–xl');
    return;
  }

  const { chain, crossesBoundary } = enclosing(element.node);
  const sizing = chain.find((node) => sizeOf(node) !== undefined);
  if (sizing) {
    const scopeSize = sizeOf(sizing);
    if (scopeSize === density) {
      removeAttr(file, attr);
      file.count('button density dropped (the scope already sets it)');
    } else {
      toSize(scopeSize === 'computed' ? 'button size set; the enclosing scope size is computed' : undefined);
    }
    return;
  }

  const scope = chain
    .map((node) => asElement(file, node))
    .find((candidate) => candidate?.identity.pkg === 'react-ui' && SCOPES.has(candidate.identity.path.join('.')));
  if (scope && ts.isJsxElement(scope.node)) {
    const hoist = hoistFor(file, { ...scope, node: scope.node });
    if (hoist?.size === density) {
      removeAttr(file, attr);
      file.count('button density dropped (hoisted to its scope)');
      return;
    }
    toSize();
    return;
  }
  toSize(crossesBoundary ? 'button size set: its scope is decided by the caller (another component)' : undefined);
};
