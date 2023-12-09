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

// import { Bug } from '@phosphor-icons/react';

// TODO(burdon): Hide URL if cursor is outside.
// Notes:
// - https://discuss.codemirror.net/t/focusing-inputs-within-widgets/5178/7
//   Widgets intentionally always get set to contenteditable=false, or they would become part of CodeMirror’s editable content element.
//   You should be able to introduce new contenteditable=true child elements inside of them.

const markdownLinkRegexp = /\[([^\]]+)]\(([^)]+)\)(!?)/gi;

/*
export interface HyperLinkState {
  at: number;
  url: string;
  anchor?: (dom: HTMLAnchorElement) => HTMLAnchorElement;
}

class HyperLinkIcon extends WidgetType {
  private readonly state: HyperLinkState;
  constructor(state: HyperLinkState) {
    super();
    this.state = state;
  }

  override eq(other: HyperLinkIcon) {
    return this.state.url === other.state.url && this.state.at === other.state.at;
  }

  toDOM() {
    const wrapper = document.createElement('a');
    wrapper.href = this.state.url;
    wrapper.target = '_blank';
    wrapper.innerHTML = 'XXXX';
    wrapper.className = 'cm-hyperlink-icon';
    wrapper.rel = 'nofollow';
    const anchor = this.state.anchor && this.state.anchor(wrapper);
    return anchor || wrapper;
  }
}

const hyperLinkDecorations = (view: EditorView, anchor?: HyperLinkState['anchor']) => {
  const widgets: Array<Range<Decoration>> = [];
  const doc = view.state.doc;

  let match;
  while ((match = markdownLinkRegexp.exec(doc.toString())) !== null) {
    const from = match.index;
    const to = from + match[0].length;
    const widget = Decoration.widget({
      widget: new HyperLinkIcon({
        at: to,
        url: match[0],
        anchor,
      }),
      side: 1,
    });

    widgets.push(widget.range(to));
  }

  return Decoration.set(widgets);
};
*/

const linkDecorator = () =>
  new MatchDecorator({
    regexp: markdownLinkRegexp, // regexp || defaultRegexp,
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

      // TODO(burdon): Wrap with tagName?
      add(p0.start, p0.end, Decoration.mark({ class: 'cm-hyperlink-bracket' }));
      add(p1.start, p1.end, Decoration.mark({ class: 'cm-hyperlink-label' }));
      add(p2.start, p2.end, Decoration.mark({ class: 'cm-hyperlink-bracket' }));
      add(p3.start, p3.end, Decoration.mark({ class: 'cm-hyperlink-url' }));
    },
  });

// const anchor = (dom: HTMLAnchorElement) => dom;

export function hyperLinkExtension() {
  return ViewPlugin.fromClass(
    class HyperLinkView {
      readonly decorator: MatchDecorator;
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorator = linkDecorator();
        this.decorations = this.decorator.createDeco(view);
        // this.decorations = hyperLinkDecorations(view, anchor);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.decorator.updateDeco(update, this.decorations);
        }
        // this.decorations = hyperLinkDecorations(update.view, anchor);
      }
    },
    {
      decorations: (view) => view.decorations,
      eventHandlers: {
        // TODO(burdon): CLick to expand link.
        // https://discuss.codemirror.net/t/decorator-iteration-on-click-event/4226/2
        // mousedown: function (event, view) {
        //   const pos = view.posAtDOM(event.target as Node);
        //   if (pos !== 0) {
        //     console.log(pos);
        //     console.log(this);
        //   }
        // },
        // keydown: function (event, view) {
        //   console.log('??', event, view);
        //   console.log(this);
        // },
      },
    },
  );
}

export const hyperLinkStyle = EditorView.baseTheme({
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

export const hyperlink: Extension = [hyperLinkExtension(), hyperLinkStyle];
