//
// Copyright 2023 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, RangeSetBuilder, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { type SyntaxNode } from '@lezer/common';

export type PreviewBlock = {
  link: PreviewLinkRef;
  el: HTMLElement;
};

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

export type PreviewOptions = {
  addBlockContainer?: (block: PreviewBlock) => void;
  removeBlockContainer?: (block: PreviewBlock) => void;
};

/**
 * Create preview decorations.
 */
export const preview = (options: PreviewOptions = {}): Extension => {
  return [
    // NOTE: Atomic block decorations must be created from a state field, now a widget, otherwise it results in the following error:
    // "Block decorations may not be specified via plugins".
    StateField.define<DecorationSet>({
      create: (state) => buildDecorations(state, options),
      update: (decorations, tr) => {
        if (tr.docChanged) {
          return buildDecorations(tr.state, options);
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
 */
const buildDecorations = (state: EditorState, options: PreviewOptions): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();

  syntaxTree(state).iterate({
    enter: (node) => {
      switch (node.name) {
        //
        // Inline widget.
        // [Label](dxn:echo:123)
        //
        case 'Link': {
          const link = getLinkRef(state, node.node);
          if (link) {
            builder.add(
              node.from,
              node.to,
              Decoration.replace({
                widget: new PreviewInlineWidget(options, link),
                side: 1,
              }),
            );
          }
          return false;
        }

        //
        // Block widget (transclusion).
        // ![Label](dxn:echo:123)
        //
        case 'Image': {
          if (options.addBlockContainer && options.removeBlockContainer) {
            const link = getLinkRef(state, node.node);
            if (link) {
              builder.add(
                node.from,
                node.to,
                Decoration.replace({
                  block: true,
                  widget: new PreviewBlockWidget(options, link),
                }),
              );
            }
          }
          return false;
        }
      }
    },
  });

  return builder.finish();
};

/**
 * Link references.
 *  [Label](dxn:echo:123) Inline reference
 * ![Label](dxn:echo:123) Block reference
 */
export const getLinkRef = (state: EditorState, node: SyntaxNode): PreviewLinkRef | undefined => {
  const mark = node.getChildren('LinkMark');
  const urlNode = node.getChild('URL');
  if (mark && urlNode) {
    const url = state.sliceDoc(urlNode.from, urlNode.to);
    if (url.startsWith('dxn:')) {
      const label = state.sliceDoc(mark[0].to, mark[1].from);
      return {
        block: state.sliceDoc(mark[0].from, mark[0].from + 1) === '!',
        label,
        ref: url,
      };
    }
  }
};

/**
 * Inline widget.
 *  [Label](dxn:echo:123)
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

  override eq(other: this) {
    return this._link.ref === other._link.ref && this._link.label === other._link.label;
  }

  override toDOM(_view: EditorView) {
    const root = document.createElement('dx-anchor');
    root.classList.add('dx-tag--anchor');
    root.textContent = this._link.label;
    root.setAttribute('refId', this._link.ref);
    return root;
  }
}

/**
 * Block widget (e.g., for surfaces).
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

  override eq(other: this) {
    return this._link.ref === other._link.ref;
  }

  override toDOM(_view: EditorView) {
    const root = document.createElement('div');
    root.classList.add('cm-preview-block', 'density-coarse');
    this._options.addBlockContainer?.({ link: this._link, el: root });
    return root;
  }

  override destroy(root: HTMLDivElement) {
    this._options.removeBlockContainer?.({ link: this._link, el: root });
  }
}
