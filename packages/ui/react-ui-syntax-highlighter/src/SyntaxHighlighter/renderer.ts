//
// Copyright 2026 DXOS.org
//

import { type CSSProperties, type ReactNode, createElement } from 'react';
import { type SyntaxHighlighterProps } from 'react-syntax-highlighter';

type Renderer = NonNullable<SyntaxHighlighterProps['renderer']>;
type RendererProps = Parameters<Renderer>[0];
type Stylesheet = RendererProps['stylesheet'];
type RenderNode = RendererProps['rows'][number];

type StylesheetIndex = {
  /** Every class name any selector in the stylesheet mentions. */
  selectors: Set<string>;
  /** Merged stylesheet entries, keyed by a node's joined class names. */
  styles: Map<string, CSSProperties>;
};

const indexes = new WeakMap<Stylesheet, StylesheetIndex>();

const indexOf = (stylesheet: Stylesheet): StylesheetIndex => {
  let index = indexes.get(stylesheet);
  if (!index) {
    const selectors = new Set<string>();
    for (const selector of Object.keys(stylesheet)) {
      for (const className of selector.split('.')) {
        selectors.add(className);
      }
    }
    index = { selectors, styles: new Map() };
    indexes.set(stylesheet, index);
  }

  return index;
};

/**
 * Every ordered selection of one to four class names, shortest first — the selector keys a
 * compound class list can match, in the precedence order `react-syntax-highlighter` applies them.
 */
const classNameCombinations = (classNames: string[]): string[] => {
  const pool = classNames.slice(0, 4);
  const combinations: string[] = [];
  const extend = (prefix: string[], remaining: number[], size: number) => {
    if (prefix.length === size) {
      combinations.push(prefix.join('.'));
      return;
    }
    for (const position of remaining) {
      extend(
        [...prefix, pool[position]],
        remaining.filter((other) => other !== position),
        size,
      );
    }
  };
  const positions = pool.map((_, position) => position);
  for (let size = 1; size <= pool.length; size++) {
    extend([], positions, size);
  }

  return combinations;
};

const styleOf = (index: StylesheetIndex, stylesheet: Stylesheet, classNames: string[]): CSSProperties => {
  const key = classNames.join(' ');
  let style = index.styles.get(key);
  if (!style) {
    style = {};
    for (const selector of classNameCombinations(classNames.filter((className) => className !== 'token'))) {
      Object.assign(style, stylesheet[selector]);
    }
    index.styles.set(key, style);
  }

  return style;
};

const renderNode = (node: RenderNode, stylesheet: Stylesheet, useInlineStyles: boolean, key: string): ReactNode => {
  if (node.type === 'text') {
    return node.value;
  }
  if (!node.tagName) {
    return undefined;
  }

  const properties = node.properties ?? { className: [] };
  const classNames: string[] = properties.className ?? [];
  let props: Record<string, unknown>;
  if (!useInlineStyles) {
    props = { ...properties, className: classNames.join(' ') };
  } else {
    const index = indexOf(stylesheet);
    const className = [
      ...(classNames.includes('token') ? ['token'] : []),
      ...classNames.filter((name) => !index.selectors.has(name)),
    ].join(' ');
    props = {
      ...properties,
      className: className || undefined,
      style: { ...properties.style, ...styleOf(index, stylesheet, classNames) },
    };
  }

  const children = (node.children ?? []).map((child, position) =>
    renderNode(child, stylesheet, useInlineStyles, `code-segment-1-${position}`),
  );
  return createElement(node.tagName, { key, ...props }, children);
};

/**
 * Drop-in for `react-syntax-highlighter`'s default row renderer, producing the same elements.
 * The stock renderer rebuilds the stylesheet's full selector list (a quadratic scan) for every
 * token node, which dominated the main thread whenever a highlighted block re-rendered.
 */
export const renderRows: Renderer = ({ rows, stylesheet, useInlineStyles }) =>
  rows.map((row, position) => renderNode(row, stylesheet, useInlineStyles, `code-segment-${position}`));
