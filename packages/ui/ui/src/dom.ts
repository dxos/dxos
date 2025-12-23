//
// Copyright 2024 DXOS.org
//

import $ from 'cash-dom';
import type { Cash } from 'cash-dom';

export type { Cash };

// From icon-plugin.
const ICONS_URL = '/icons.svg';

export const icon = (icon: string) => ICONS_URL + '#' + icon;

/**
 * Creates an SVG element wrapped in cash-dom.
 * @param tag SVG element tag name (e.g., 'svg', 'use', 'path')
 */
const svg = (tag: string): Cash => {
  return $(document.createElementNS('http://www.w3.org/2000/svg', tag));
};

// Augment cash-dom module.
declare module 'cash-dom' {
  interface CashStatic {
    svg(tag: string): Cash;
  }
}

// Extend cash-dom with svg helper.
$.svg = svg;

export { $ };
