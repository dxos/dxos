//
// Copyright 2025 DXOS.org
//

import { type FunctionComponent } from 'react';
import { EditorView, WidgetType } from '@codemirror/view';

import { invariant } from '@dxos/invariant';
import { Domino } from '@dxos/ui';

import { type XmlWidgetProps, type XmlWidgetState } from './xml-tags';

export interface XmlWidgetNotifier {
  mounted(widget: XmlWidgetState): void;
  unmounted(id: string): void;
}

export class PlaceholderWidget<TProps extends XmlWidgetProps> extends WidgetType {
  #root: HTMLElement | null = null;
  #view: EditorView | undefined;

  constructor(
    readonly id: string,
    readonly Component: FunctionComponent<TProps>,
    readonly props: TProps,
    readonly notifier: XmlWidgetNotifier,
    readonly streaming?: boolean,
  ) {
    super();
    invariant(id);
  }

  get root(): HTMLElement | null {
    return this.#root;
  }

  override eq(other: this) {
    if (this.streaming) {
      return false;
    }
    return this.id === other.id;
  }

  override ignoreEvent() {
    return true;
  }

  override toDOM(view: EditorView) {
    this.#view = view;
    this.#root = Domino.of('div').classNames('min-h-[24px]').root;
    const props = Object.assign({}, this.props, { view }) as TProps;
    this.notifier.mounted({ id: this.id, root: this.#root, props, Component: this.Component });
    return this.#root;
  }

  override updateDOM(dom: HTMLElement) {
    this.#root = dom;
    const props = Object.assign({}, this.props, { view: this.#view }) as TProps;
    this.notifier.mounted({ id: this.id, root: this.#root, props, Component: this.Component });
    return true;
  }

  override destroy(_dom: HTMLElement) {
    this.notifier.unmounted(this.id);
    this.#root = null;
    this.#view = undefined;
  }
}
