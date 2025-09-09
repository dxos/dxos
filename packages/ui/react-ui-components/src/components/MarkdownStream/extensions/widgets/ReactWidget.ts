//
// Copyright 2025 DXOS.org
//

import { type EditorView, WidgetType } from '@codemirror/view';
import { type ComponentType, type ReactElement, createElement } from 'react';
import { type Root } from 'react-dom/client';

import { renderRoot } from '@dxos/react-ui-editor';

/**
 * Wrapper for React components.
 */
export class ReactWidget<Props extends {} = {}> extends WidgetType {
  private readonly component: ComponentType<Props>;
  private readonly props: Props;

  constructor(component: ComponentType<Props>, props: Props) {
    super();
    this.component = component;
    this.props = props;
  }

  override toDOM(_view: EditorView): HTMLElement {
    const container = document.createElement('span');
    const element: ReactElement<Props> = createElement(this.component, this.props);
    const root = renderRoot(container, element);

    // Store root for cleanup.
    (container as any)._reactRoot = root;
    return container;
  }

  override destroy(dom: HTMLElement): void {
    const root = (dom as any)._reactRoot as Root | undefined;
    if (root) {
      // TODO(burdon): Warning: Attempted to synchronously unmount a root while React was already rendering.
      // root.unmount();
    }
  }

  override eq(other: WidgetType): boolean {
    return (
      other instanceof ReactWidget &&
      other.component === this.component &&
      JSON.stringify(other.props) === JSON.stringify(this.props)
    );
  }
}
