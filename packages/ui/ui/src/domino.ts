//
// Copyright 2025 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ClassNameValue } from '@dxos/ui-types';

// From icon-plugin.
const ICONS_URL = '/icons.svg';

/**
 * Super lightweight chainable DOM builder.
 */
export class Domino<T extends HTMLElement | SVGElement> {
  static SVG = 'http://www.w3.org/2000/svg';

  static icon = (icon: string) => ICONS_URL + '#' + icon;

  static of<K extends keyof HTMLElementTagNameMap>(tag: K): Domino<HTMLElementTagNameMap[K]>;
  static of<K extends keyof SVGElementTagNameMap>(tag: K, namespace: string): Domino<SVGElementTagNameMap[K]>;
  static of(tag: string, namespace?: string): Domino<HTMLElement | SVGElement> {
    return new Domino(tag, namespace);
  }

  private readonly _el: T;

  private constructor(tag: string, namespace?: string) {
    if (namespace) {
      this._el = document.createElementNS(namespace, tag) as T;
    } else {
      this._el = document.createElement(tag) as T;
    }
  }

  classNames(...classNames: ClassNameValue[]): this {
    const merged = mx(classNames);
    if (this._el instanceof HTMLElement || this._el instanceof SVGElement) {
      this._el.setAttribute('class', merged);
    }
    return this;
  }

  text(value: string): this {
    this._el.textContent = value;
    return this;
  }

  data(key: string, value: string): this {
    if (this._el instanceof HTMLElement) {
      this._el.dataset[key] = value;
    }
    return this;
  }

  attributes(attr: Record<string, string | undefined>): this {
    Object.entries(attr)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => this._el.setAttribute(key, value!));
    return this;
  }

  style(styles: Partial<CSSStyleDeclaration>): this {
    Object.assign(this._el.style, styles);
    return this;
  }

  children<C extends HTMLElement | SVGElement>(...children: Domino<C>[]): this {
    children.forEach((child) => this._el.appendChild(child.root));
    return this;
  }

  on(event: string, handler: (e: Event) => void): this {
    this._el.addEventListener(event, handler);
    return this;
  }

  get root(): T {
    return this._el;
  }
}
