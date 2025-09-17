//
// Copyright 2023 DXOS.org
//

import '@dxos/lit-ui/dx-ref-tag.pcss';

import { syntaxTree } from '@codemirror/language';
import {
  type EditorState,
  type Extension,
  type RangeSet,
  RangeSetBuilder,
  StateField,
  type Transaction,
} from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { type SyntaxNode } from '@lezer/common';

export type PreviewLinkRef = {
  suggest?: boolean;
  block?: boolean;
  label: string;
  ref: string;
};

export type PreviewLinkTarget = {
  label: string;
  text?: string;
  object?: any;
};

// TODO(wittjosiah): Remove.
// TODO(burdon): Handle error.
export type PreviewLookup = (link: PreviewLinkRef) => Promise<PreviewLinkTarget | null | undefined>;

export type PreviewOptions = {
  addBlockContainer?: (link: PreviewLinkRef, el: HTMLElement) => void;
  removeBlockContainer?: (link: PreviewLinkRef) => void;
};

/**
 * Create preview decorations.
 */
export const preview = (options: PreviewOptions = {}): Extension => {
  return [
    // NOTE: Atomic block decorations must be created from a state field, now a widget, otherwise it results in the following error:
    // "Block decorations may not be specified via plugins".
    StateField.define<DecorationSet>({
      create: (state) => buildLinkDecorations(state, options),
      update: (decorations: RangeSet<Decoration>, tr: Transaction) => {
        if (tr.docChanged) {
          return buildLinkDecorations(tr.state, options);
        }

        return decorations.map(tr.changes);
      },
      provide: (field) => [
        EditorView.decorations.from(field),
        EditorView.atomicRanges.of((view) => view.state.field(field)),
      ],
    }),
  ];
};

/**
 * Echo references are represented as markdown reference links.
 * https://www.markdownguide.org/basic-syntax/#reference-style-links
 * [Label|block][dxn:echo:123]
 * [Label|inline][dxn:echo:123]
 */
const buildLinkDecorations = (state: EditorState, options: PreviewOptions) => {
  const builder = new RangeSetBuilder<Decoration>();

  syntaxTree(state).iterate({
    enter: (node) => {
      switch (node.name) {
        //
        // Decoration.
        // [Label][dxn:echo:123]
        //
        case 'Link': {
          const link = getLinkRef(state, node.node);
          if (link) {
            builder.add(
              node.from,
              node.to,
              Decoration.replace({
                widget: new PreviewInlineWidget(options, link),
              }),
            );
          }
          break;
        }
        //
        // Block widget.
        // ![Label][dxn:echo:123]
        //
        case 'Image': {
          const link = getLinkRef(state, node.node);
          if (options.addBlockContainer && options.removeBlockContainer && link) {
            builder.add(
              node.from,
              node.to,
              Decoration.replace({
                block: true,
                // atomic: true,
                widget: new PreviewBlockWidget(options, link),
              }),
            );
          }
          break;
        }
      }
    },
  });

  return builder.finish();
};

/**
 * Link references.
 *
 *  [Label][dxn:echo:123]    Inline reference
 * ![Label][dxn:echo:123]    Block reference
 * ![Label][?dxn:echo:123]   Suggestion
 */
export const getLinkRef = (state: EditorState, node: SyntaxNode): PreviewLinkRef | undefined => {
  const mark = node.getChild('LinkMark');
  const label = node.getChild('LinkLabel');
  console.log(mark);
  console.log({ mark, label, text: state.sliceDoc(node.from, node.to) });
  if (mark && label) {
    const ref = state.sliceDoc(label.from + 1, label.to - 1);
    return {
      suggest: ref.startsWith('?'),
      block: state.sliceDoc(mark.from, mark.from + 1) === '!',
      label: state.sliceDoc(mark.to, label.from - 1),
      ref: ref.startsWith('?') ? ref.slice(1) : ref,
    };
  }
};

/**
 * Inline widget.
 * [Label][dxn:echo:123]
 */
class PreviewInlineWidget extends WidgetType {
  constructor(
    readonly _options: PreviewOptions,
    readonly _link: PreviewLinkRef,
  ) {
    super();
  }

  // override ignoreEvent() {
  //   return false;
  // }

  override eq(other: this): boolean {
    return this._link.ref === other._link.ref && this._link.label === other._link.label;
  }

  override toDOM(_view: EditorView): HTMLElement {
    const root = document.createElement('dx-ref-tag');
    root.textContent = this._link.label;
    root.setAttribute('refId', this._link.ref);
    return root;
  }
}

/**
 * Block widget.
 * ![Label][dxn:echo:123]
 */
class PreviewBlockWidget extends WidgetType {
  constructor(
    readonly _options: PreviewOptions,
    readonly _link: PreviewLinkRef,
  ) {
    super();
  }

  // override ignoreEvent() {
  //   return true;
  // }

  override eq(other: this): boolean {
    return this._link.ref === other._link.ref;
  }

  override toDOM(view: EditorView): HTMLDivElement {
    const root = document.createElement('div');
    root.classList.add('cm-preview-block', 'density-coarse');
    this._options.addBlockContainer?.(this._link, root);
    return root;
  }

  override destroy() {
    this._options.removeBlockContainer?.(this._link);
  }
}
