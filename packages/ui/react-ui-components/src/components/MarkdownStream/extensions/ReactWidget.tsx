//
// Copyright 2025 DXOS.org
//

import { type EditorView, WidgetType } from '@codemirror/view';
import React, { createElement } from 'react';
import { type ComponentType } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { invariant } from '@dxos/invariant';
import { ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

/**
 * Placeholder for React widgets.
 */
export class ReactWidget<Props extends {} = {}> extends WidgetType {
  private container: HTMLElement | null = null;
  private root: Root | null = null;

  constructor(
    public readonly id: string,
    private readonly component: ComponentType<Props>,
    private readonly props: Props,
  ) {
    super();
    invariant(id);
  }

  override eq(other: WidgetType): boolean {
    return other instanceof ReactWidget && this.id === other.id;
  }

  override toDOM(_view: EditorView): HTMLElement {
    this.container = document.createElement('span');
    this.root = createRoot(this.container);
    this.render();
    return this.container;
  }

  override destroy(_dom: HTMLElement): void {
    if (this.root) {
      // Defers `unmount` until after React’s render pass finishes.
      queueMicrotask(() => {
        this.root?.unmount();
        this.container = null;
        this.root = null;
      });
    }
  }

  /**
   * Called by extension when props are updated via state effect.
   */
  render(state = {}) {
    if (!this.root) {
      return;
    }

    const element = createElement(this.component, { ...this.props, ...state });
    this.root.render(<ThemeProvider tx={defaultTx}>{element}</ThemeProvider>);
    // createPortal(<ThemeProvider tx={defaultTx}>{element}</ThemeProvider>, this.container);
  }
}

// TODO(burdon): Move widgets to a common context.
/* 
  <>
    <div id="editor" />
    <WidgetLayer widgets={widgets} />
  </> 

  export function WidgetLayer({ widgets }: { widgets: { key: string, dom: HTMLElement }[] }) {
  return (
    <>
      {widgets.map(w =>
        createPortal(<MyWidget />, w.dom, w.key)
      )}
    </>
  );
}
*/
