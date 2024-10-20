//
// Copyright 2024 DXOS.org
//

import { html } from 'lit';
import { directive, type AttributePart, Directive, type DirectiveParameters } from 'lit/directive.js';

// TODO(burdon): Factor out to lit-components.
// TODO(burdon): Use with codemirror and other non-react ux.
// TODO(burdon): Use Theme (mx, etc.)

type DynamicAttributeProps = Record<string, string>;

class DynamicAttributeDirective extends Directive {
  render(_attributes: DynamicAttributeProps) {
    return html``;
  }

  override update(part: AttributePart, [attributes]: DirectiveParameters<this>) {
    Object.entries(attributes).forEach(([key, value]) => {
      part.element.setAttribute(key, value);
    });

    return this.render(attributes);
  }
}

const attr = directive(DynamicAttributeDirective);

export type ButtonProps = {
  className: string;
  icon: string;
} & DynamicAttributeProps;

export const button = ({ className, icon, ...attributes }: ButtonProps) => {
  return html`
    <button class="${className}" ${attr(attributes)}>
      <svg>
        <use href="/icons.svg#${icon}" />
      </svg>
    </button>
  `;
};
