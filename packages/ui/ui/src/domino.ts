//
// Copyright 2025 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ClassNameValue } from '@dxos/ui-types';

/**
 * Base URL of the icon sprite sheet emitted by `@dxos/vite-plugin-icons`.
 * Defaults to `/icons.svg` which works inside hosted apps served at the
 * site root. Callers running in a different origin context (e.g. browser
 * extensions that inject into arbitrary pages) can override by assigning
 * `Domino.iconsUrl` before first use.
 */
const DEFAULT_ICONS_URL = '/icons.svg';

/**
 * Super lightweight chainable DOM builder.
 */
export class Domino<T extends HTMLElement | SVGElement> {
  static SVG = 'http://www.w3.org/2000/svg';

  /** Overridable at module level so `Domino.svg()` can resolve from any origin. */
  static iconsUrl: string = DEFAULT_ICONS_URL;

  // TODO(burdon): Make private.
  static icon = (icon: string) => Domino.iconsUrl + '#' + icon;

  /**
   * Creates an SVG icon element from the icon sprite sheet.
   */
  // TODO(burdon): Rename icon.
  static svg = (icon: string) =>
    Domino.of('svg', Domino.SVG)
      .classNames('shrink-0 h-[1em] w-[1em]')
      .attributes({ viewBox: '0 0 256 256' })
      .append(Domino.of('use', Domino.SVG).attributes({ href: Domino.icon(icon) }));

  /**
   * Create builder from DOM node.
   */
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

  append<C extends HTMLElement | SVGElement>(...children: Domino<C>[]): this {
    children.forEach((child) => this._el.appendChild(child.root));
    return this;
  }

  /**
   * Typed event listener. Accepts the standard `AddEventListenerOptions`
   * third argument so callers can opt into `capture`, `once`, `passive`.
   */
  on<K extends keyof HTMLElementEventMap>(
    event: K,
    handler: (e: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): this;
  on(event: string, handler: (e: Event) => void, options?: boolean | AddEventListenerOptions): this;
  on(event: string, handler: (e: Event) => void, options?: boolean | AddEventListenerOptions): this {
    this._el.addEventListener(event, handler, options);
    return this;
  }

  /**
   * Convenience for attaching the root element to a parent node — useful at
   * the end of a chain to avoid a trailing `.root` / `parent.appendChild()`.
   */
  mount(parent: Node): this {
    parent.appendChild(this._el);
    return this;
  }

  get root(): T {
    return this._el;
  }
}
