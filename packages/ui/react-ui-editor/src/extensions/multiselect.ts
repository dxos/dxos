//
// Copyright 2025 DXOS.org
//

import {
  autocompletion,
  completionKeymap,
  type Completion,
  type CompletionResult,
  type CompletionContext,
} from '@codemirror/autocomplete';
import { markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder, type Extension } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  type PluginValue,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';

export type MultiselectOptions = {
  debug?: boolean;
  // TODO(burdon): Generalize.
  renderIconButton?: (el: HTMLElement, icon: string, cb: () => void) => void;
  onSearch?: (text: string) => Completion[];
};

export const multiselect = ({ debug, renderIconButton, onSearch }: MultiselectOptions = {}): Extension => {
  const extensions: Extension[] = [
    keymap.of(completionKeymap),
    styles,

    // TODO(burdon): Remove non-linked content on space/enter.
    autocompletion({
      activateOnTyping: true,
      closeOnBlur: !debug,
      tooltipClass: () => 'shadow rounded',
    }),

    ViewPlugin.fromClass(
      class implements PluginValue {
        deco: DecorationSet;
        constructor(view: EditorView) {
          this.deco = this.buildDecorations(view);
        }

        update(update: ViewUpdate) {
          if (update.docChanged || update.viewportChanged) {
            this.deco = this.buildDecorations(update.view);
          }
        }

        buildDecorations(view: EditorView) {
          const builder = new RangeSetBuilder<Decoration>();
          syntaxTree(view.state).iterate({
            enter: (node) => {
              if (node.name === 'Link') {
                const urlNode = node.node.getChild('URL');
                if (urlNode) {
                  const from = node.from;
                  const to = node.to;
                  const text = view.state.doc.sliceString(from + 1, urlNode.from - 2);
                  const url = view.state.sliceDoc(urlNode.from, urlNode.to);
                  builder.add(
                    from,
                    to,
                    Decoration.replace({
                      widget: new LinkWidget(renderIconButton, text, url, () => {
                        view.dispatch({
                          changes: {
                            from,
                            to,
                            insert: '',
                          },
                        });
                        view.focus();
                      }),
                    }),
                  );
                }
              }
            },
          });

          return builder.finish();
        }
      },
      {
        decorations: (instance) => instance.deco,
        provide: (plugin) =>
          EditorView.atomicRanges.of((view) => {
            return view.plugin(plugin)?.deco || Decoration.none;
          }),
      },
    ),
  ];

  if (onSearch) {
    extensions.push(
      markdownLanguage.data.of({
        autocomplete: (context: CompletionContext): CompletionResult | null => {
          const match = context.matchBefore(/\w*/);
          if (!match || (match.from === match.to && !context.explicit)) {
            return null;
          }

          return {
            from: match.from,
            options: onSearch(match.text.toLowerCase()),
          };
        },
      }),
    );
  }

  return extensions;
};

class LinkWidget extends WidgetType {
  constructor(
    private readonly renderIconButton: MultiselectOptions['renderIconButton'],
    private readonly text: string,
    private readonly url: string,
    private readonly onDelete: () => void,
  ) {
    super();
  }

  toDOM() {
    const el = document.createElement('span');
    el.className = 'cm-link';
    el.textContent = this.text;

    const button = document.createElement('span');
    button.className = 'cm-link-button';
    this.renderIconButton?.(button, 'ph--x--regular', this.onDelete);
    el.appendChild(button);

    return el;
  }
}

const styles = EditorView.theme({
  '.cm-link': {
    border: '1px solid var(--dx-primary-500)',
    borderRadius: '4px',
    padding: '2px 4px',
    margin: '0 4px',
    textDecoration: 'none',
  },
  '.cm-link-button': {
    display: 'inline-block',
    width: '0.75rem',
    marginLeft: '4px',
    cursor: 'pointer',
    opacity: 0.5,
  },
  '.cm-link-button:hover': {
    opacity: 1,
  },
});
