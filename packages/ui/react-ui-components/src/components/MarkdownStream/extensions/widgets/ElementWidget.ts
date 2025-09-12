//
// Copyright 2025 DXOS.org
//

import { WidgetType } from '@codemirror/view';

import { type registry } from '../../registry';
import { type XmlWidgetFactory } from '../xml-tags';

export const ElementWidgetFactory: XmlWidgetFactory = ({ tag, ...props }) => new ElementWidget(tag, props);

type ElementProps = Partial<{ children?: string[] } & Record<string, string>>;

/**
 * Simple widget to create HTML elements from XML props.
 */
export class ElementWidget extends WidgetType {
  constructor(
    private tag: keyof typeof registry,
    private props: ElementProps,
  ) {
    super();
  }

  private createUserMessageElement() {
    const el = document.createElement('div');
    el.role = 'none';
    el.className = 'flex justify-end';
    const inner = document.createElement('p');
    // NOTE: Container must set var based on user's identity.
    inner.className = 'pli-3 plb-2 bg-[--user-fill] rounded-sm';
    inner.textContent = String(this.props.children);
    el.appendChild(inner);
    return el;
  }

  private createReferenceElement() {
    const el = document.createElement('dx-ref-tag');
    el.setAttribute('refid', this.props.reference ?? 'never');
    el.textContent = String(this.props.children);
    return el;
  }

  private createFallbackElement() {
    const el = document.createElement(this.tag);
    Object.entries(this.props ?? {}).forEach(([key, value]) => {
      if (key === 'children') {
        el.innerText = String(value);
      } else {
        el.setAttribute(key, String(value));
      }
    });
    return el;
  }

  private createButtonElement(textContent: string, icon?: string) {
    const el = document.createElement('button');
    el.className = 'dx-button animate-[fadeIn_0.5s] gap-2';
    el.dataset.density = 'fine';
    if (icon) {
      const iconElement = document.createElement('dx-icon');
      iconElement.setAttribute('icon', icon);
      el.appendChild(iconElement);
    }
    el.appendChild(document.createTextNode(textContent));
    return el;
  }

  private createButtonGroupElement() {
    const el = document.createElement('div');
    el.role = 'group';
    el.className = 'flex flex-wrap gap-1';
    this.props.children?.forEach((child) => {
      const optionChild = child as unknown as { tag: string; children: string[] };
      el.appendChild(this.createButtonElement(String(optionChild.children)));
    });
    return el;
  }

  private createSummaryElement() {
    const el = document.createElement('div');
    el.className = 'text-sm text-subdued';
    el.textContent = String(this.props.children);
    return el;
  }

  private createSuggestionElement() {
    return this.createButtonElement(String(this.props.children), 'ph--lightning--regular');
  }

  override toDOM(): HTMLElement {
    switch (this.tag) {
      case 'prompt':
        return this.createUserMessageElement();
      case 'reference':
        return this.createReferenceElement();
      case 'summary':
        return this.createSummaryElement();
      case 'suggestion':
        return this.createSuggestionElement();
      case 'select':
        return this.createButtonGroupElement();
      default:
        return this.createFallbackElement();
    }
  }

  override eq(other: WidgetType): boolean {
    return (
      other instanceof ElementWidget &&
      other.tag === this.tag &&
      JSON.stringify(other.props) === JSON.stringify(this.props)
    );
  }
}
