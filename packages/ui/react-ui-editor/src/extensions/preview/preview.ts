//
// Copyright 2023 DXOS.org
//

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
  block?: boolean;
  label: string;
  dxn: string;
};

export type PreviewLinkTarget = {
  label: string;
  text: string;
};

export type PreviewAction =
  | {
      type: 'apply';
      link: PreviewLinkRef;
      target: PreviewLinkTarget;
    }
  | {
      type: 'cancel';
      link: PreviewLinkRef;
    };

export type PreviewLookup = (link: PreviewLinkRef) => Promise<PreviewLinkTarget>;

export type PreviewActionHandler = (action: PreviewAction) => void;

export type PreviewRenderProps = {
  link: PreviewLinkRef;
  onAction: PreviewActionHandler;
  onLookup: PreviewLookup;
};

export type PreviewOptions = {
  // TODO(burdon): Handle render callbacks uniformly across all extensions. Pass object.
  onRenderBlock: (el: HTMLElement, props: PreviewRenderProps) => void;
  onRenderPopover?: (el: HTMLElement, props: PreviewRenderProps) => void;
  onLookup: PreviewLookup;
};

// TODO(burdon): Callback to retrieve data from ECHO.
// TODO(burdon): Make backspace delete the entire range.
// TODO(burdon): Popover (card).

/**
 * Create preview decorations.
 */
export const preview = (options: PreviewOptions): Extension => {
  return [
    // NOTE: Atomic block decorations must be created from a state field, now a widget, otherwise it results in the following error:
    // "Block decorations may not be specified via plugins"
    StateField.define<DecorationSet>({
      create: (state) => buildDecorations(state, options),
      update: (_: RangeSet<Decoration>, tr: Transaction) => buildDecorations(tr.state, options),
      provide: (field) => [
        EditorView.decorations.from(field),
        EditorView.atomicRanges.of((view) => view.state.field(field)),
      ],
    }),

    EditorView.theme({
      '.cm-preview-inline': {
        padding: '0.25rem',
        borderRadius: '0.25rem',
        background: 'var(--dx-modalSurface)',
        border: '1px solid var(--dx-separator)',
      },
      '.cm-preview-block': {
        marginLeft: '-1rem',
        marginRight: '-1rem',
        padding: '1rem',
        borderRadius: '0.5rem',
        background: 'var(--dx-modalSurface)',
        border: '1px solid var(--dx-separator)',
      },
    }),
  ];
};

const getLinkRef = (state: EditorState, node: SyntaxNode): PreviewLinkRef | undefined => {
  const mark = node.getChild('LinkMark');
  const label = node.getChild('LinkLabel');
  if (mark && label) {
    return {
      block: state.sliceDoc(mark.from, mark.from + 1) === '!',
      label: state.sliceDoc(mark.to, label.from - 1),
      dxn: state.sliceDoc(label.from, label.to),
    };
  }
};

/**
 * Echo references are represented as markdown reference links.
 * https://www.markdownguide.org/basic-syntax/#reference-style-links
 * [Label|block][dxn:echo:123]
 * [Label|inline][dxn:echo:123]
 */
const buildDecorations = (state: EditorState, options: PreviewOptions) => {
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
          if (link) {
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
    return this._link.dxn === other._link.dxn && this._link.label === other._link.label;
  }

  override toDOM(view: EditorView) {
    const root = document.createElement('span');
    root.classList.add('cm-preview-inline');
    root.innerHTML = this._link.label;
    return root;
  }
}

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
    return this._link.dxn === other._link.dxn;
  }

  override toDOM(view: EditorView) {
    const root = document.createElement('div');
    root.classList.add('cm-preview-block');

    // TODO(burdon): Inject handler.
    const handleAction: PreviewActionHandler = (action) => {
      const pos = view.posAtDOM(root);
      const node = syntaxTree(view.state).resolve(pos + 1).node.parent;
      if (!node) {
        return;
      }

      const link = getLinkRef(view.state, node);
      if (link?.dxn !== action.link.dxn) {
        return;
      }

      switch (action.type) {
        case 'apply': {
          // Insert text.
          // TODO(burdon): Should this insert directly into the document? (i.e., be handled externally?)
          view.dispatch({
            changes: {
              from: node.from,
              to: node.to,
              insert: action.target.text,
            },
          });
          break;
        }
        case 'cancel': {
          // Remove ref.
          view.dispatch({
            changes: {
              from: node.from,
              to: node.to,
              insert: '',
            },
          });
          break;
        }
      }
    };

    this._options.onRenderBlock(root, {
      link: this._link,
      onAction: handleAction,
      onLookup: this._options.onLookup,
    });

    return root;
  }
}
