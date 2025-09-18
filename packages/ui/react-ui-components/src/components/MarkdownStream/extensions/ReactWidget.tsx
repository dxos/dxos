//
// Copyright 2025 DXOS.org
//

import { type EditorView, WidgetType } from '@codemirror/view';
import React, { createElement } from 'react';
import { type ComponentType } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

/**
 * Placeholder for React components.
 */
export class ReactWidget<Props extends {} = {}> extends WidgetType {
  private readonly component: ComponentType<Props>;
  private readonly props: Props;
  private container: HTMLElement | null = null;
  private root: Root | null = null;

  // TODO(burdon): Need ID.
  constructor(component: ComponentType<Props>, props: Props) {
    super();
    this.component = component;
    this.props = props;
  }

  // TODO(burdon): Check ID.
  override eq(other: WidgetType): boolean {
    return (
      other instanceof ReactWidget &&
      this.component === other.component &&
      JSON.stringify(this.props) === JSON.stringify(other.props)
    );
  }

  override toDOM(view: EditorView): HTMLElement {
    this.container = document.createElement('span');
    this.root = createRoot(this.container);
    this.render(view);
    return this.container;
  }

  override destroy(_dom: HTMLElement): void {
    if (this.root) {
      // Defers unmount() until after React’s render pass finishes.
      queueMicrotask(() => {
        this.root?.unmount();
        this.root = null;
      });
    }
    this.container = null;
  }

  // TODO(burdon): Call with props when state field is updated.
  render(_view: EditorView, props = {}) {
    if (!this.root) {
      return;
    }

    // TODO(burdon): Document efficiency aspects.
    const element = createElement(this.component, { ...this.props, ...props });
    this.root.render(<ThemeProvider tx={defaultTx}>{element}</ThemeProvider>);
  }
}
