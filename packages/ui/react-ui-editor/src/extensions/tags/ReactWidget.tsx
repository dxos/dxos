//
// Copyright 2025 DXOS.org
//

import { type EditorView, WidgetType } from '@codemirror/view';
import { type FC } from 'react';

import { invariant } from '@dxos/invariant';

import { type XmlWidgetNotifier } from './xml-tags';

/**
 * Placeholder for React widgets.
 */
export class ReactWidget<Props extends {} = {}> extends WidgetType {
  private _root: HTMLElement | null = null;

  constructor(
    public readonly id: string,
    public readonly Component: FC<Props>,
    public readonly props: Props,
    private readonly notifier: XmlWidgetNotifier,
  ) {
    super();
    invariant(id);
  }

  get root() {
    return this._root;
  }

  override eq(other: WidgetType): boolean {
    return other instanceof ReactWidget && this.id === other.id;
  }

  override toDOM(_view: EditorView): HTMLElement {
    this._root = document.createElement('span');
    this.notifier.mounted({ id: this.id, props: this.props, root: this._root, Component: this.Component });
    return this._root;
  }

  override destroy(_dom: HTMLElement): void {
    this.notifier.unmounted(this.id);
    this._root = null;
  }
}
