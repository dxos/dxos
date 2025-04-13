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
import { Prec, RangeSetBuilder, type Extension } from '@codemirror/state';
import {
  keymap,
  Decoration,
  type DecorationSet,
  EditorView,
  type PluginValue,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';

export type MultiselectItem = { id: string; label: string };

/**
 * Apply function formats item as link.
 */
export const multiselectApply = (view: EditorView, completion: Completion, from: number, to: number) => {
  const id = (completion as MultiselectItem).id;
  const label = completion.label;
  view.dispatch({ changes: { from, to, insert: `[${label}](${id})` } });
};

export type MultiselectOptions = {
  debug?: boolean;
  // TODO(burdon): Generalize.
  renderIcon?: (el: HTMLElement, icon: string, cb: () => void) => void;
  onSelect?: (id: string) => void;
  onSearch?: (text: string, ids: Set<string>) => MultiselectItem[];
  onUpdate?: (ids: string[]) => void;
};

/**
 * Uses the markdown parser to parse links, which are decorated as pill buttons.
 */
export const multiselect = ({
  debug,
  renderIcon,
  onSelect,
  onSearch,
  onUpdate,
}: MultiselectOptions = {}): Extension => {
  const ids: string[] = [];
  const currentIds = new Set<string>();

  const extensions: Extension[] = [
    keymap.of(completionKeymap),
    Prec.highest(
      keymap.of([
        {
          key: 'Tab',
          run: () => true,
          preventDefault: true,
        },
      ]),
    ),

    // Autocomplete.
    autocompletion({
      activateOnTyping: true,
      closeOnBlur: !debug,
      tooltipClass: () => 'shadow rounded',
    }),

    // Update when modified (either by editing or external updates).
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onUpdate?.(ids);
      }
    }),

    // Decorations.
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
          ids.length = 0;
          const builder = new RangeSetBuilder<Decoration>();
          syntaxTree(view.state).iterate({
            enter: (node) => {
              if (node.name === 'Link') {
                const urlNode = node.node.getChild('URL');
                if (urlNode) {
                  const from = node.from;
                  const to = node.to;
                  const text = view.state.doc.sliceString(from + 1, urlNode.from - 2);
                  const id = view.state.sliceDoc(urlNode.from, urlNode.to);
                  ids.push(id);
                  builder.add(
                    from,
                    to,
                    Decoration.replace({
                      widget: new ItemWidget(
                        renderIcon,
                        text,
                        id,
                        (id) => onSelect?.(id),
                        (_id) => {
                          view.dispatch({ changes: { from, to, insert: '' } });
                          view.focus();
                        },
                      ),
                    }),
                  );
                }
              }
            },
          });

          currentIds.clear();
          for (const id of ids) {
            currentIds.add(id);
          }
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

    styles,
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
            options: onSearch(match.text.toLowerCase(), currentIds).map(({ id, label }) => ({
              id,
              label,
              apply: multiselectApply,
            })),
          };
        },
      }),
    );
  }

  return extensions;
};

class ItemWidget extends WidgetType {
  constructor(
    private readonly renderIcon: MultiselectOptions['renderIcon'],
    private readonly text: string,
    private readonly id: string,
    private readonly onSelect: (id: string) => void,
    private readonly onDelete: (id: string) => void,
  ) {
    super();
  }

  // Prevents re-rendering.
  override eq(widget: this) {
    return widget.id === this.id;
  }

  toDOM() {
    const main = document.createElement('span');
    main.className = 'cm-item';

    const link = document.createElement('span');
    link.className = 'cm-item-text';
    link.textContent = this.text;
    link.addEventListener('click', () => this.onSelect(this.id));
    main.appendChild(link);

    const button = document.createElement('span');
    button.className = 'cm-item-button';
    this.renderIcon?.(button, 'ph--x--regular', () => this.onDelete(this.id));
    main.appendChild(button);

    const space = document.createElement('span');
    space.textContent = ' ';

    const el = document.createElement('span');
    el.appendChild(main);
    el.appendChild(space);
    return el;
  }
}

const styles = EditorView.theme({
  // Hide scrollbar.
  '.cm-scroller': {
    scrollbarWidth: 'none', // Firefox.
  },
  '.cm-scroller::-webkit-scrollbar': {
    display: 'none', // WebKit.
  },
  '.cm-line': {
    lineHeight: '2 !important',
  },
  '.cm-item': {
    border: '1px solid var(--dx-separator)',
    borderRadius: '4px',
    padding: '2px 3px',
    marginLeft: '2px',
    textDecoration: 'none',
  },
  '.cm-item:hover': {
    backgroundColor: 'var(--dx-hoverSurface)',
  },
  '.cm-item-text': {
    cursor: 'pointer',
  },
  '.cm-item-button': {
    display: 'inline-block',
    width: '0.75rem',
    marginLeft: '4px',
    cursor: 'pointer',
    opacity: 0.5,
  },
  '.cm-item-button:hover': {
    opacity: 1,
  },
});
