//
// Copyright 2025 DXOS.org
//

import { mx } from '@dxos/react-ui-theme';
import { type ClassNameValue } from '@dxos/react-ui-types';

/**
 * Super lightweight chainable DOM builder.
 */
export class Domino<T extends HTMLElement> {
  static of<K extends keyof HTMLElementTagNameMap>(tag: K): Domino<HTMLElementTagNameMap[K]> {
    return new Domino<HTMLElementTagNameMap[K]>(tag);
  }

  private readonly _el: T;
  constructor(tag: keyof HTMLElementTagNameMap) {
    this._el = document.createElement(tag) as T;
  }
  classNames(...classNames: ClassNameValue[]): this {
    this._el.className = mx(classNames);
    return this;
  }
  text(value: string): this {
    this._el.textContent = value;
    return this;
  }
  data(key: string, value: string): this {
    this._el.dataset[key] = value;
    return this;
  }
  style(styles: Partial<CSSStyleDeclaration>): this {
    Object.assign(this._el.style, styles);
    return this;
  }
  attr<K extends keyof T>(key: K, value: T[K]): this {
    (this._el as any)[key] = value;
    return this;
  }
  children<C extends HTMLElement>(...children: Domino<C>[]): this {
    children.forEach((child) => this._el.appendChild(child.build()));
    return this;
  }
  on(event: string, handler: (e: Event) => void): this {
    this._el.addEventListener(event, handler);
    return this;
  }
  build(): T {
    return this._el;
  }
}
