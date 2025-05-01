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

import { type RenderCallback } from '../../types';

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

export type PreviewAction =
  | {
      type: 'insert';
      link: PreviewLinkRef;
      target: PreviewLinkTarget;
    }
  | {
      type: 'delete';
      link: PreviewLinkRef;
    };

// TODO(burdon): Handle error.
export type PreviewLookup = (link: PreviewLinkRef) => Promise<PreviewLinkTarget | null | undefined>;

export type PreviewActionHandler = (action: PreviewAction) => void;

export type PreviewRenderProps = {
  readonly: boolean;
  link: PreviewLinkRef;
  onAction: PreviewActionHandler;
  onLookup: PreviewLookup;
};

export type PreviewOptions = {
  renderBlock?: RenderCallback<PreviewRenderProps>;
  onLookup: PreviewLookup;
};

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

/**
 * Link references.
 *
 *  [Label][dxn:echo:123]    Inline reference
 * ![Label][dxn:echo:123]    Block reference
 * ![Label][?dxn:echo:123]   Suggestion
 */
const getLinkRef = (state: EditorState, node: SyntaxNode): PreviewLinkRef | undefined => {
  const mark = node.getChild('LinkMark');
  const label = node.getChild('LinkLabel');
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
          if (options.renderBlock && link) {
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

  override eq(other: this) {
    return this._link.ref === other._link.ref && this._link.label === other._link.label;
  }

  override toDOM(view: EditorView) {
    const root = document.createElement('dx-ref-tag');
    root.setAttribute('label', this._link.label);
    root.setAttribute('ref', this._link.ref);
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

  override eq(other: this) {
    return this._link.ref === other._link.ref;
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
      if (link?.ref !== action.link.ref) {
        return;
      }

      switch (action.type) {
        // TODO(burdon): Should we dispatch to the view or mutate the document? (i.e., handle externally?)
        // Insert ref text.
        case 'insert': {
          view.dispatch({
            changes: {
              from: node.from,
              to: node.to,
              insert: action.target.text,
            },
          });
          break;
        }
        // Remove ref.
        case 'delete': {
          view.dispatch({
            changes: {
              from: node.from,
              to: node.to,
            },
          });
          break;
        }
      }
    };

    this._options.renderBlock!(
      root,
      {
        readonly: view.state.readOnly,
        link: this._link,
        onAction: handleAction,
        onLookup: this._options.onLookup,
      },
      view,
    );

    return root;
  }
}
