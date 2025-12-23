//
// Copyright 2024 DXOS.org
//

import type { ClassNameValue } from '@dxos/ui-types';
import { mx } from '@dxos/ui-theme';

export type Domino = {
  text(content: string): Domino;
  addClass(...classes: ClassNameValue[]): Domino;
  append(child: HTMLElement | SVGElement | Domino | (HTMLElement | SVGElement | Domino)[]): Domino;
  attr(name: string, value?: string): Domino;
  css(styles: Record<string, string>): Domino;
  get(): (HTMLElement | SVGElement)[];
  get(index: number): HTMLElement | SVGElement | undefined;
  find(selector: string): Domino;
  readonly length: number;
  readonly [index: number]: HTMLElement | SVGElement | undefined;
};

/**
 * Minimal jQuery-like DOM manipulation utility.
 * Implements only the methods used in our codebase.
 */
class DominoImpl implements Domino {
  private elements: (HTMLElement | SVGElement)[];

  constructor(elements: (HTMLElement | SVGElement)[]) {
    this.elements = elements;
    // Create indexed properties for array-like access
    elements.forEach((el, i) => {
      (this as any)[i] = el;
    });
  }

  get length(): number {
    return this.elements.length;
  }

  [index: number]: HTMLElement | SVGElement | undefined;

  text(content: string): Domino {
    this.elements.forEach((el) => (el.textContent = content));
    return this;
  }

  addClass(...classes: ClassNameValue[]): Domino {
    // Use mx to merge and deduplicate classes
    const merged = mx(...classes);
    if (merged) {
      const classList = merged.split(/\s+/).filter(Boolean);
      this.elements.forEach((el) => {
        el.classList.add(...classList);
      });
    }
    return this;
  }

  append(child: HTMLElement | SVGElement | Domino | (HTMLElement | SVGElement | Domino)[]): Domino {
    let children: (HTMLElement | SVGElement)[];

    if (Array.isArray(child)) {
      children = [];
      for (const item of child) {
        if (item instanceof DominoImpl) {
          children.push(...item.get());
        } else {
          children.push(item as HTMLElement | SVGElement);
        }
      }
    } else if (child instanceof DominoImpl) {
      children = child.get();
    } else {
      children = [child as HTMLElement | SVGElement];
    }

    this.elements.forEach((el) => {
      children.forEach((c) => el.appendChild(c.cloneNode(true) as HTMLElement | SVGElement));
    });
    return this;
  }

  attr(name: string, value?: string): Domino {
    if (value === undefined) {
      return this;
    }
    this.elements.forEach((el) => el.setAttribute(name, value));
    return this;
  }

  css(styles: Record<string, string>): Domino {
    this.elements.forEach((el) => {
      if (el instanceof HTMLElement || el instanceof SVGElement) {
        Object.entries(styles).forEach(([key, value]) => {
          (el.style as any)[key] = value;
        });
      }
    });
    return this;
  }

  get(): (HTMLElement | SVGElement)[];
  get(index: number): HTMLElement | SVGElement | undefined;
  get(index?: number): (HTMLElement | SVGElement)[] | HTMLElement | SVGElement | undefined {
    if (index === undefined) {
      return this.elements;
    }
    return this.elements[index];
  }

  find(selector: string): Domino {
    const found: (HTMLElement | SVGElement)[] = [];
    this.elements.forEach((el) => {
      const matches = el.querySelectorAll(selector);
      matches.forEach((match) => {
        if (match instanceof HTMLElement || match instanceof SVGElement) {
          found.push(match);
        }
      });
    });
    return new DominoImpl(found);
  }
}

/**
 * Create a Domino instance from a selector or HTML string.
 * @param selector CSS selector or HTML string like '<div>' or '<span>'
 */
export function $(selector: string): Domino {
  // Check if it's an HTML string (starts with '<' and ends with '>')
  if (selector.startsWith('<') && selector.endsWith('>')) {
    const tagName = selector.slice(1, -1);
    const element = document.createElement(tagName);
    return new DominoImpl([element]);
  }

  // Otherwise treat as CSS selector
  const elements = Array.from(document.querySelectorAll(selector));
  const filtered = elements.filter((el) => el instanceof HTMLElement || el instanceof SVGElement) as (
    | HTMLElement
    | SVGElement
  )[];
  return new DominoImpl(filtered);
}

// From icon-plugin.
const ICONS_URL = '/icons.svg';

export const icon = (icon: string) => ICONS_URL + '#' + icon;

/**
 * Creates an SVG element wrapped in Domino.
 * @param tag SVG element tag name (e.g., 'svg', 'use', 'path')
 */
const svg = (tag: string): Domino => {
  return new DominoImpl([document.createElementNS('http://www.w3.org/2000/svg', tag) as SVGElement]);
};

// Extend $ with svg helper.
$.svg = svg;

// Legacy export for backwards compatibility
export type Cash = Domino;
