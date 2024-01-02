//
// Copyright 2023 DXOS.org
// Adapted from: https://github.com/uiwjs/react-codemirror/blob/master/extensions/hyper-link/src/index.ts
//

import { type Extension } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';

// TODO(burdon): Reconcile with theme.
export const styles = EditorView.baseTheme({
  '.cm-hyperlink-label': {
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  '.cm-hyperlink-bracket': {
    opacity: 0.2,
  },
  '.cm-hyperlink-url': {
    opacity: 0.5,
    fontFamily: 'monospace',
  },
});

const markdownLinkRegexp = /\[([^\]]+)]\(([^)]+)\)(!?)/gi;

/**
 * Custom link decorator.
 * NOTE: The default markdown extension formats links by default.
 * @deprecated
 */
const linkDecorator = () =>
  new MatchDecorator({
    regexp: markdownLinkRegexp,
    decorate: (add, from, to, match, view) => {
      const [_, label, url] = match;
      const p0 = {
        start: from,
        end: from + 1,
      };

      const p1 = {
        start: from + 1,
        end: from + 1 + label.length,
      };

      const p2 = {
        start: p1.end,
        end: p1.end + 1,
      };

      const p3 = {
        start: p1.end + 1,
        end: p1.end + 1 + url.length + 2,
      };

      add(
        p0.start,
        p0.end,
        Decoration.mark({ class: 'cm-hyperlink-bracket', _attributes: { style: 'display: none' } }),
      );
      add(p1.start, p1.end, Decoration.mark({ class: 'cm-hyperlink-label' }));
      add(
        p2.start,
        p2.end,
        Decoration.mark({ class: 'cm-hyperlink-bracket', _attributes: { style: 'display: none' } }),
      );
      add(p3.start, p3.end, Decoration.mark({ class: 'cm-hyperlink-url', _attributes: { style: 'display: none' } }));
    },
  });

export function hyperLinkExtension() {
  return ViewPlugin.fromClass(
    class HyperLinkView {
      readonly decorator: MatchDecorator;
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorator = linkDecorator();
        this.decorations = this.decorator.createDeco(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.decorator.updateDeco(update, this.decorations);
        }
      }
    },
    {
      decorations: (value) => value.decorations,
      eventHandlers: {
        // TODO(burdon): CLick to expand link.
        // https://discuss.codemirror.net/t/decorator-iteration-on-click-event/4226/2
        mousedown: function (event, view) {
          const pos = view.posAtDOM(event.target as Node);
          if (pos !== 0) {
            console.log(this);
          }
        },
        // TODO(burdon): Hide when cursor moves away.
        keydown: (event, view) => {
          view.update([]);
        },
      },
    },
  );
}

export const hyperlinkWidget: Extension = [hyperLinkExtension(), styles];
