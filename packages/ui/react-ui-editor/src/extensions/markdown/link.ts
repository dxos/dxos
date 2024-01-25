//
// Copyright 2023 DXOS.org
// Copyright CodeMirror
//

import { syntaxTree } from '@codemirror/language';
import { type Extension, RangeSetBuilder } from '@codemirror/state';
import {
  hoverTooltip,
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';
import { type SyntaxNode } from '@lezer/common';

import { tooltipContent } from '@dxos/react-ui-theme';

// Adapted from:
// https://codemirror.net/try/?c=aW1wb3J0IHsgYmFzaWNTZXR1cCwgRWRpdG9yVmlldyB9IGZyb20gImNvZGVtaXJyb3IiCmltcG9ydCB7IG1hcmtkb3duIH0gZnJvbSAiQGNvZGVtaXJyb3IvbGFuZy1tYXJrZG93biIKaW1wb3J0IHsgc3ludGF4VHJlZSB9IGZyb20gIkBjb2RlbWlycm9yL2xhbmd1YWdlIjsKaW1wb3J0IHsgRWRpdG9yU3RhdGUsIFJhbmdlU2V0QnVpbGRlciwgU3RhdGVGaWVsZCB9IGZyb20gIkBjb2RlbWlycm9yL3N0YXRlIjsKaW1wb3J0IHsgRGVjb3JhdGlvbiwgV2lkZ2V0VHlwZSB9IGZyb20gIkBjb2RlbWlycm9yL3ZpZXciOwoKY2xhc3MgTGluayBleHRlbmRzIFdpZGdldFR5cGUgewogIGNvbnN0cnVjdG9yKHRleHQsIHVybCkgewogICAgc3VwZXIoKQogICAgdGhpcy50ZXh0ID0gdGV4dAogICAgdGhpcy51cmwgPSB1cmwKICB9CiAgZXEob3RoZXIpIHsgcmV0dXJuIHRoaXMudGV4dCA9PSBvdGhlci50ZXh0ICYmIHRoaXMudXJsID09IG90aGVyLnVybCB9CiAgdG9ET00oKSB7CiAgICBsZXQgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoImEiKQogICAgbGluay50ZXh0Q29udGVudCA9IHRoaXMudGV4dAogICAgbGluay5ocmVmID0gdGhpcy51cmwKICAgIHJldHVybiBsaW5rOwogIH0KfQoKbGV0IGRlY29yYXRpb25zRmllbGQgPSBTdGF0ZUZpZWxkLmRlZmluZSh7CiAgY3JlYXRlKCkgewogICAgcmV0dXJuIERlY29yYXRpb24ubm9uZTsKICB9LAogIHVwZGF0ZShfLCB0cikgewogICAgY29uc3QgYnVpbGRlciA9IG5ldyBSYW5nZVNldEJ1aWxkZXIoKTsKICAgIGxldCBjdXJzb3IgPSB0ci5zdGF0ZS5zZWxlY3Rpb24ubWFpbi5oZWFkOwogICAgc3ludGF4VHJlZSh0ci5zdGF0ZSkuaXRlcmF0ZSh7CiAgICAgIGVudGVyOiAobm9kZSkgPT4gewogICAgICAgIGlmICgoY3Vyc29yIDwgbm9kZS5mcm9tIHx8IGN1cnNvciA+IG5vZGUudG8pICYmIG5vZGUubmFtZSA9PSAiTGluayIpIHsKICAgICAgICAgIGxldCBtYXJrcyA9IG5vZGUubm9kZS5nZXRDaGlsZHJlbigiTGlua01hcmsiKTsKICAgICAgICAgIGxldCB0ZXh0ID0gbWFya3MubGVuZ3RoID49IDIgPyB0ci5zdGF0ZS5zbGljZURvYyhtYXJrc1swXS50bywgbWFya3NbMV0uZnJvbSkgOiAiIgoKICAgICAgICAgIGxldCB1cmxOb2RlID0gbm9kZS5ub2RlLmdldENoaWxkKCJVUkwiKTsKICAgICAgICAgIGxldCB1cmwgPSB1cmxOb2RlID8gdHIuc3RhdGUuc2xpY2VEb2ModXJsTm9kZS5mcm9tLCB1cmxOb2RlLnRvKSA6ICIiCiAgICAgICAgICBidWlsZGVyLmFkZChub2RlLmZyb20sIG5vZGUudG8sIERlY29yYXRpb24ucmVwbGFjZSh7CiAgICAgICAgICAgIHdpZGdldDogbmV3IExpbmsodGV4dCwgdXJsKSwKICAgICAgICAgIH0pLAogICAgICAgICAgICAgICAgICAgICApOwogICAgICAgICAgcmV0dXJuIGZhbHNlOwogICAgICAgIH0KICAgICAgICByZXR1cm4gdHJ1ZTsKICAgICAgfSwKICAgIH0pOwogICAgcmV0dXJuIGJ1aWxkZXIuZmluaXNoKCk7CiAgfSwKICBwcm92aWRlOiAoZikgPT4gRWRpdG9yVmlldy5kZWNvcmF0aW9ucy5mcm9tKGYpLAp9KTsKCmxldCB2aWV3ID0gbmV3IEVkaXRvclZpZXcoewogIGRvYzogIiMgSGVsbG8gV29ybGRcblxuW1Rlc3RdKGh0dHBzOi8vZXhhbXBsZS5jb20pXG5cblxuIiwKICBleHRlbnNpb25zOiBbZGVjb3JhdGlvbnNGaWVsZCwgbWFya2Rvd24oKV0sCiAgcGFyZW50OiBkb2N1bWVudC5ib2R5LAp9KTsKCnZpZXcuZm9jdXMoKTs=
// https://discuss.codemirror.net/t/link-widget-is-clicked-only-if-editor-is-out-of-focus/7433

export type LinkOptions = {
  link?: boolean;
  onHover?: (el: Element, url: string) => void;
  onRender?: (el: Element, url: string) => void;
};

/**
 * Creates a state field to replace AST elements with a hyperlink widget.
 * https://codemirror.net/docs/ref/#state.StateField
 */
export const link = (options: LinkOptions = {}): Extension => {
  const extensions: Extension[] = [
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
          this.decorations = buildDecorations(view, options);
        }

        update(update: ViewUpdate) {
          if (update.docChanged || update.viewportChanged || update.selectionSet) {
            this.decorations = buildDecorations(update.view, options);
          }
        }
      },
      {
        decorations: (v) => v.decorations,
      },
    ),
  ];

  if (options.onHover) {
    extensions.push(
      // https://codemirror.net/examples/tooltip
      // https://codemirror.net/docs/ref/#view.hoverTooltip
      // https://github.com/codemirror/view/blob/main/src/tooltip.ts
      hoverTooltip((view, pos, side) => {
        const syntax = syntaxTree(view.state).resolveInner(pos, side);
        let link = null;
        for (let i = 0, node: SyntaxNode | null = syntax; !link && node && i < 5; node = node.parent, i++) {
          link = node.name === 'Link' ? node : null;
        }
        const url = link && link.getChild('URL');
        if (!url || !link) {
          return null;
        }
        const urlText = view.state.sliceDoc(url.from, url.to);
        return {
          pos: link.from,
          end: link.to,
          above: true,
          create: () => {
            const el = document.createElement('div');
            el.className = tooltipContent({}, 'pli-2 plb-1');
            options.onHover!(el, urlText);
            return { dom: el, offset: { x: 0, y: 4 } };
          },
        };
      }),
    );
  }

  return extensions;
};

class LinkButton extends WidgetType {
  constructor(private readonly _url: string, private readonly _onAttach: LinkOptions['onRender']) {
    super();
  }

  override eq(other: this) {
    return this._url === other._url;
  }

  override toDOM(view: EditorView) {
    const el = document.createElement('span');
    this._onAttach!(el, this._url);
    return el;
  }
}

class LinkText extends WidgetType {
  constructor(private readonly _text: string, private readonly _url?: string) {
    super();
  }

  override eq(other: this) {
    return this._url === other._url;
  }

  override toDOM(view: EditorView) {
    const link = document.createElement('a');
    link.setAttribute('class', 'cm-link');
    link.textContent = this._text;
    if (this._url) {
      link.setAttribute('rel', 'noreferrer');
      link.setAttribute('target', '_blank');
      link.href = this._url;
    } else {
      link.onclick = () => {
        view.dispatch({
          selection: {
            anchor: view.posAtDOM(link),
          },
        });
      };
    }

    return link;
  }
}

/**
 * Range sets provide a data structure that can hold a collection of tagged,
 * possibly overlapping ranges in such a way that they can efficiently be mapped though document changes.
 * https://codemirror.net/docs/ref/#state
 */
const buildDecorations = (view: EditorView, options: LinkOptions): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const { state } = view;
  const cursor = state.selection.main.head;

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      enter: (node) => {
        // Check if cursor is inside text.
        if (node.name === 'Link') {
          const marks = node.node.getChildren('LinkMark');
          const text = marks.length >= 2 ? state.sliceDoc(marks[0].to, marks[1].from) : '';
          const urlNode = node.node.getChild('URL');
          const url = urlNode ? state.sliceDoc(urlNode.from, urlNode.to) : '';
          if (!url) {
            return false;
          }

          if (!view.hasFocus || state.readOnly || cursor < node.from || cursor > node.to) {
            builder.add(
              node.from,
              node.to,
              Decoration.replace({
                widget: new LinkText(text, options.link ? url : undefined),
              }),
            );
          }

          if (options.onRender) {
            builder.add(
              node.to,
              node.to,
              Decoration.replace({
                widget: new LinkButton(url, options.onRender),
              }),
            );
          }

          return false;
        }
      },
      from,
      to,
    });
  }

  return builder.finish();
};
