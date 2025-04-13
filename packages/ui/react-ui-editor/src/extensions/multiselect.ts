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
  keymap,
  Decoration,
  type DecorationSet,
  EditorView,
  type PluginValue,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';

export type MultiselectItem = Completion & { id: string };

export const multiselectApply = (view: EditorView, completion: Completion, from: number, to: number) => {
  const id = (completion as MultiselectItem).id;
  const label = completion.label;
  view.dispatch({ changes: { from, to, insert: `[${label}](${id})` } });
};

export type MultiselectOptions = {
  debug?: boolean;
  // TODO(burdon): Generalize.
  renderIconButton?: (el: HTMLElement, icon: string, cb: () => void) => void;
  onSelect?: (id: string) => void;
  onSearch?: (text: string, ids: Set<string>) => Completion[];
  onUpdate?: (ids: Set<string>) => void;
};

// TODO(burdon): Factor out multiselect editor to react-ui-pickers.
// TODO(burdon): Convert array of links to text when load/save document.
export const multiselect = ({
  debug,
  renderIconButton,
  onSelect,
  onSearch,
  onUpdate,
}: MultiselectOptions = {}): Extension => {
  const ids = new Set<string>();

  const extensions: Extension[] = [
    keymap.of(completionKeymap),
    styles,

    // Autocomplete.
    autocompletion({
      activateOnTyping: true,
      closeOnBlur: !debug,
      tooltipClass: () => 'shadow rounded',
    }),

    // Update when modified.
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
          ids.clear();
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
                  ids.add(id);
                  builder.add(
                    from,
                    to,
                    Decoration.replace({
                      widget: new LinkWidget(
                        renderIconButton,
                        text,
                        id,
                        (id) => onSelect?.(id),
                        (id) => {
                          ids.delete(id);
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
            options: onSearch(match.text.toLowerCase(), ids),
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
    private readonly id: string,
    private readonly onSelect: (id: string) => void,
    private readonly onDelete: (id: string) => void,
  ) {
    super();
  }

  toDOM() {
    const main = document.createElement('span');
    main.className = 'cm-link';

    const link = document.createElement('span');
    link.className = 'cm-link-text';
    link.textContent = this.text;
    link.addEventListener('click', () => this.onSelect(this.id));
    main.appendChild(link);

    const button = document.createElement('span');
    button.className = 'cm-link-button';
    this.renderIconButton?.(button, 'ph--x--regular', () => this.onDelete(this.id));
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
  '.cm-link': {
    border: '1px solid var(--dx-separator)',
    borderRadius: '4px',
    padding: '2px 4px',
    marginLeft: '4px',
    textDecoration: 'none',
  },
  '.cm-link:hover': {
    backgroundColor: 'var(--dx-hoverSurface)',
  },
  '.cm-link-text': {
    cursor: 'pointer',
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
