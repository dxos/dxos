//
// Copyright 2023 DXOS.org
// Copyright CodeMirror
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type RangeSet, RangeSetBuilder, StateField, type Transaction } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';

// Adapted from:
// https://codemirror.net/try/?c=aW1wb3J0IHsgYmFzaWNTZXR1cCwgRWRpdG9yVmlldyB9IGZyb20gImNvZGVtaXJyb3IiCmltcG9ydCB7IG1hcmtkb3duIH0gZnJvbSAiQGNvZGVtaXJyb3IvbGFuZy1tYXJrZG93biIKaW1wb3J0IHsgc3ludGF4VHJlZSB9IGZyb20gIkBjb2RlbWlycm9yL2xhbmd1YWdlIjsKaW1wb3J0IHsgRWRpdG9yU3RhdGUsIFJhbmdlU2V0QnVpbGRlciwgU3RhdGVGaWVsZCB9IGZyb20gIkBjb2RlbWlycm9yL3N0YXRlIjsKaW1wb3J0IHsgRGVjb3JhdGlvbiwgV2lkZ2V0VHlwZSB9IGZyb20gIkBjb2RlbWlycm9yL3ZpZXciOwoKY2xhc3MgTGluayBleHRlbmRzIFdpZGdldFR5cGUgewogIGNvbnN0cnVjdG9yKHRleHQsIHVybCkgewogICAgc3VwZXIoKQogICAgdGhpcy50ZXh0ID0gdGV4dAogICAgdGhpcy51cmwgPSB1cmwKICB9CiAgZXEob3RoZXIpIHsgcmV0dXJuIHRoaXMudGV4dCA9PSBvdGhlci50ZXh0ICYmIHRoaXMudXJsID09IG90aGVyLnVybCB9CiAgdG9ET00oKSB7CiAgICBsZXQgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoImEiKQogICAgbGluay50ZXh0Q29udGVudCA9IHRoaXMudGV4dAogICAgbGluay5ocmVmID0gdGhpcy51cmwKICAgIHJldHVybiBsaW5rOwogIH0KfQoKbGV0IGRlY29yYXRpb25zRmllbGQgPSBTdGF0ZUZpZWxkLmRlZmluZSh7CiAgY3JlYXRlKCkgewogICAgcmV0dXJuIERlY29yYXRpb24ubm9uZTsKICB9LAogIHVwZGF0ZShfLCB0cikgewogICAgY29uc3QgYnVpbGRlciA9IG5ldyBSYW5nZVNldEJ1aWxkZXIoKTsKICAgIGxldCBjdXJzb3IgPSB0ci5zdGF0ZS5zZWxlY3Rpb24ubWFpbi5oZWFkOwogICAgc3ludGF4VHJlZSh0ci5zdGF0ZSkuaXRlcmF0ZSh7CiAgICAgIGVudGVyOiAobm9kZSkgPT4gewogICAgICAgIGlmICgoY3Vyc29yIDwgbm9kZS5mcm9tIHx8IGN1cnNvciA+IG5vZGUudG8pICYmIG5vZGUubmFtZSA9PSAiTGluayIpIHsKICAgICAgICAgIGxldCBtYXJrcyA9IG5vZGUubm9kZS5nZXRDaGlsZHJlbigiTGlua01hcmsiKTsKICAgICAgICAgIGxldCB0ZXh0ID0gbWFya3MubGVuZ3RoID49IDIgPyB0ci5zdGF0ZS5zbGljZURvYyhtYXJrc1swXS50bywgbWFya3NbMV0uZnJvbSkgOiAiIgoKICAgICAgICAgIGxldCB1cmxOb2RlID0gbm9kZS5ub2RlLmdldENoaWxkKCJVUkwiKTsKICAgICAgICAgIGxldCB1cmwgPSB1cmxOb2RlID8gdHIuc3RhdGUuc2xpY2VEb2ModXJsTm9kZS5mcm9tLCB1cmxOb2RlLnRvKSA6ICIiCiAgICAgICAgICBidWlsZGVyLmFkZChub2RlLmZyb20sIG5vZGUudG8sIERlY29yYXRpb24ucmVwbGFjZSh7CiAgICAgICAgICAgIHdpZGdldDogbmV3IExpbmsodGV4dCwgdXJsKSwKICAgICAgICAgIH0pLAogICAgICAgICAgICAgICAgICAgICApOwogICAgICAgICAgcmV0dXJuIGZhbHNlOwogICAgICAgIH0KICAgICAgICByZXR1cm4gdHJ1ZTsKICAgICAgfSwKICAgIH0pOwogICAgcmV0dXJuIGJ1aWxkZXIuZmluaXNoKCk7CiAgfSwKICBwcm92aWRlOiAoZikgPT4gRWRpdG9yVmlldy5kZWNvcmF0aW9ucy5mcm9tKGYpLAp9KTsKCmxldCB2aWV3ID0gbmV3IEVkaXRvclZpZXcoewogIGRvYzogIiMgSGVsbG8gV29ybGRcblxuW1Rlc3RdKGh0dHBzOi8vZXhhbXBsZS5jb20pXG5cblxuIiwKICBleHRlbnNpb25zOiBbZGVjb3JhdGlvbnNGaWVsZCwgbWFya2Rvd24oKV0sCiAgcGFyZW50OiBkb2N1bWVudC5ib2R5LAp9KTsKCnZpZXcuZm9jdXMoKTs=
// https://discuss.codemirror.net/t/link-widget-is-clicked-only-if-editor-is-out-of-focus/7433

// TODO(burdon): Adapt to make all markdown editable?

// TODO(burdon): Research overlays.
//  https://stackoverflow.com/questions/26933344/codemirror-detect-and-create-links-inside-editor
//  https://codemirror.net/5/doc/manual.html#addOverlay
//  https://codemirror.net/5/demo/simplemode.html
//  https://codemirror.net/5/demo/search.html (Search dialog).

class LinkButton extends WidgetType {
  constructor(
    private readonly _anchor: number,
    private readonly _url: string,
    private readonly _onAttach: LinkOptions['onRender'],
  ) {
    super();
  }

  override eq(other: LinkButton) {
    return this._anchor === other._anchor && this._url === other._url;
  }

  toDOM(view: EditorView) {
    const el = document.createElement('span');
    this._onAttach!(el, this._url);
    return el;
  }
}

class LinkText extends WidgetType {
  constructor(private readonly _anchor: number, private readonly _text: string, private readonly _url?: string) {
    super();
  }

  override eq(other: LinkText) {
    return this._anchor === other._anchor && this._text === other._text && this._url === other._url;
  }

  toDOM(view: EditorView) {
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
            anchor: this._anchor,
          },
        });
      };
    }

    return link;
  }
}

const update = (state: EditorState, options: LinkOptions) => {
  const builder = new RangeSetBuilder();
  const cursor = state.selection.main.head;
  syntaxTree(state).iterate({
    enter: (node) => {
      // Check if cursor is inside text.
      if (node.name === 'Link') {
        const marks = node.node.getChildren('LinkMark');
        const text = marks.length >= 2 ? state.sliceDoc(marks[0].to, marks[1].from) : '';

        const urlNode = node.node.getChild('URL');
        const url = urlNode ? state.sliceDoc(urlNode.from, urlNode.to) : '';

        if (cursor < node.from || cursor > node.to) {
          builder.add(
            node.from,
            node.to,
            Decoration.replace({
              widget: new LinkText(node.from, text, options.link ? url : undefined),
            }),
          );
        }

        if (options.onRender) {
          builder.add(
            node.to,
            node.to,
            Decoration.replace({
              widget: new LinkButton(node.from, url, options.onRender),
            }),
          );
        }
      }

      return true;
    },
  });

  return builder.finish();
};

export type LinkOptions = {
  link?: boolean;
  onRender?: (el: Element, url: string) => void;
};

/**
 * Creates a state field to replace AST elements with a hyperlink widget.
 * https://codemirror.net/docs/ref/#state.StateField
 */
export const link = (options: LinkOptions = {}) => {
  return StateField.define<RangeSet<any>>({
    create: (state) => update(state, options),
    update: (_: RangeSet<any>, tr: Transaction) => update(tr.state, options),
    provide: (field) => EditorView.decorations.from(field),
  });
};
