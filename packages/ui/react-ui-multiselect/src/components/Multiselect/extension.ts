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
  debug?: boolean;
  onSelect?: (id: string) => void;
  onSearch?: (text: string, ids: string[]) => MultiselectItem[];
  onUpdate?: (ids: string[]) => void;
};

/**
 * Uses the markdown parser to parse links, which are decorated as pill buttons.
 */
export const multiselect = ({ debug, onSelect, onSearch, onUpdate }: MultiselectOptions): Extension => {
  /** Ordered list of ids. */
  const ids: string[] = [];
  /** Range spans for each id. */
  const itemSpan = new Map<string, { from: number; to: number }>();

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
          itemSpan.clear();
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
                  itemSpan.set(id, { from, to });
                  builder.add(
                    from,
                    to,
                    Decoration.replace({
                      widget: new ItemWidget({
                        itemId: item.id,
                        label: item.label,
                        onItemClick: ({ action, itemId }) => {
                          const span = itemSpan.get(itemId);
                          switch (action) {
                            case 'activate': {
                              onSelect?.(itemId);
                              if (span) {
                                view.dispatch({ selection: { anchor: span.to } });
                              }
                              break;
                            }
                            case 'remove': {
                              if (span) {
                                view.dispatch({ changes: { from: span.from, to: span.to, insert: '' } });
                                view.focus();
                              }
                              break;
                            }
                          }
                        },
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
            options: onSearch(match.text.toLowerCase(), ids).map(({ id, label }) => ({
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
  private itemId: PillProps['itemId'] = 'never';
  private label: PillProps['label'] = 'never';
  private onItemClick: PillProps['onItemClick'];
  constructor(props: Pick<PillProps, 'itemId' | 'label' | 'onItemClick'>) {
    super();
    this.itemId = props.itemId ?? 'never';
    this.label = props.label ?? 'never';
    this.onItemClick = props.onItemClick;
  }

  // Prevents re-rendering.
  override eq(widget: this) {
    return widget.itemId === this.itemId;
  }

  toDOM() {
    const el = document.createElement('dx-tag-picker-item');
    el.setAttribute('itemId', this.itemId ?? 'never');
    el.setAttribute('label', this.label ?? 'never');
    if (this.onItemClick) {
      el.addEventListener('dx-tag-picker-item-click', this.onItemClick as any);
    }
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
