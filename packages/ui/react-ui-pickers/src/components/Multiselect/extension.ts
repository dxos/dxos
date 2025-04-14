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

import { type PillProps } from './Pill';

export type MultiselectItem = { id: string; label: string };

export const createLinks = (items: MultiselectItem[]) => {
  return items.map(({ id, label }) => `[${label}](${id})`).join('');
};

/**
 * Apply function formats item as link.
 */
export const multiselectApply = (view: EditorView, completion: Completion, from: number, to: number) => {
  const id = (completion as MultiselectItem).id;
  const label = completion.label;
  view.dispatch({ changes: { from, to, insert: `[${label}](${id})` } });

  // TODO(burdon): Hack.
  // Since renders async, need to wait for DOM to update.
  setTimeout(() => {
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    scrollToCursor(view);
  }, 100);
};

const scrollToCursor = (view: EditorView) => {
  const { from } = view.state.selection.main;
  const rect = view.coordsAtPos(from);
  if (rect) {
    const editorDom = view.scrollDOM;
    const offsetLeft = rect.left - editorDom.offsetLeft;
    const scrollMargin = 20; // Margin to show before/after caret.
    editorDom.scrollLeft = offsetLeft - scrollMargin;
  }
};

export type MultiselectOptions = {
  render: (el: HTMLElement, props: PillProps) => void;
  debug?: boolean;
  onSelect?: (id: string) => void;
  onSearch?: (text: string, ids: Set<string>) => MultiselectItem[];
  onUpdate?: (ids: string[]) => void;
};

/**
 * Uses the markdown parser to parse links, which are decorated as pill buttons.
 */
export const multiselect = ({ debug, render, onSelect, onSearch, onUpdate }: MultiselectOptions): Extension => {
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
      tooltipClass: () => 'border border-separator',
      optionClass: () => '!p-1',
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
                  const id = view.state.sliceDoc(urlNode.from, urlNode.to);
                  const text = view.state.doc.sliceString(from + 1, urlNode.from - 2);
                  const item: MultiselectItem = { id, label: text };
                  ids.push(id);
                  builder.add(
                    from,
                    to,
                    Decoration.replace({
                      widget: new ItemWidget(render, {
                        item,
                        onSelect: (item) => onSelect?.(item.id),
                        onDelete: () => {
                          view.dispatch({ changes: { from, to, insert: '' } });
                          view.focus();
                        },
                      }),
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
    private readonly render: MultiselectOptions['render'],
    private readonly props: PillProps,
  ) {
    super();
  }

  // Prevents re-rendering.
  override eq(widget: this) {
    return widget.props.item.id === this.props.item.id;
  }

  toDOM() {
    const el = document.createElement('span');
    el.className = 'cm-item';
    this.render(el, this.props);
    return el;
  }
}

const styles = EditorView.theme({
  // Constrain max width to editor.
  '.cm-tooltip.cm-tooltip-autocomplete': {
    left: '3px !important',
    width: 'var(--dx-multiselectWidth)',
    marginTop: '6.5px',
  },
  '.cm-completionLabel': {},
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: 'var(--dx-hoverSurface)',
  },

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
    padding: '0 2px',
  },
});
