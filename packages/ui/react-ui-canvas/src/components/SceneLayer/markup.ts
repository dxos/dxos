//
// Copyright 2026 DXOS.org
//

import { type CSSProperties, type ReactNode, createElement } from 'react';

import { type SvgFile } from '@dxos/diagram';

const camel = (name: string) => name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

/** An SVG attribute as React names it: `class` is `className`, a hyphenated one camel-cased, `data-*` kept. */
const propName = (name: string) =>
  name === 'class' ? 'className' : name.startsWith('data-') || name.startsWith('aria-') ? name : camel(name);

/** An inline `style` attribute as the object React takes. */
const styleObject = (style: string): CSSProperties =>
  Object.fromEntries(
    style
      .split(';')
      .map((declaration) => declaration.trim())
      .filter((declaration) => declaration.length > 0)
      .map((declaration) => {
        const colon = declaration.indexOf(':');
        return [camel(declaration.slice(0, colon).trim()), declaration.slice(colon + 1).trim()];
      }),
  );

/**
 * `SvgFile` markup as React elements, so the canvas draws the very elements the diagram's SVG file holds: React writes
 * each back under its SVG name, so the rendered DOM matches `SvgFile.serialize`.
 */
export const renderMarkup = (node: SvgFile.Markup | string, key?: number): ReactNode => {
  if (typeof node === 'string') {
    return node;
  }
  const props: Record<string, string | number | CSSProperties> = {};
  for (const [name, value] of Object.entries(node.attrs)) {
    if (value === undefined || value === false) {
      continue;
    }
    props[propName(name)] =
      name === 'style' ? styleObject(String(value)) : typeof value === 'number' ? value : String(value);
  }
  return createElement(node.tag, { key, ...props }, ...node.children.map((child, index) => renderMarkup(child, index)));
};
