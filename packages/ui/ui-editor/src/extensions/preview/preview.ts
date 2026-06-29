//
// Copyright 2023 DXOS.org
//

import { type EditorState } from '@codemirror/state';
import { EditorView, WidgetType } from '@codemirror/view';
import { type SyntaxNode } from '@lezer/common';

/** @deprecated Use xmlTags with urlSchemes instead. */
export type PreviewBlock = {
  link: PreviewLinkRef;
  el: HTMLElement;
};

export type PreviewLinkRef = {
  suggest?: boolean;
  block?: boolean;
  label: string;
  dxn: string;
};

export type PreviewLinkTarget = {
  label: string;
  text?: string;
  object?: any;
};

/**
 * Link references.
 *  [Label](echo:/123) Inline reference
 * ![Label](echo:/123) Block reference
 */
export const getLinkRef = (state: EditorState, node: SyntaxNode): PreviewLinkRef | undefined => {
  const mark = node.getChildren('LinkMark');
  const urlNode = node.getChild('URL');
  if (mark && urlNode) {
    const dxn = state.sliceDoc(urlNode.from, urlNode.to);
    if (dxn.startsWith('dxn:') || dxn.startsWith('echo:')) {
      const label = state.sliceDoc(mark[0].to, mark[1].from);
      return {
        block: state.sliceDoc(mark[0].from, mark[0].from + 1) === '!',
        label,
        dxn,
      };
    }
  }
};

/**
 * Inline widget for echo/dxn links.
 *  [Label](echo:/123)
 */
export class AnchorInlineWidget extends WidgetType {
  constructor(
    readonly _label: string,
    readonly _dxn: string,
  ) {
    super();
  }

  override eq(other: this) {
    return this._dxn === other._dxn && this._label === other._label;
  }

  override toDOM(_view: EditorView) {
    const root = document.createElement('dx-anchor');
    root.classList.add('dx-tag--anchor');
    root.textContent = this._label;
    root.setAttribute('dxn', this._dxn);
    return root;
  }
}
