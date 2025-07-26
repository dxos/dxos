//
// Copyright 2025 DXOS.org
//

import {
  type Completion,
  type CompletionResult,
  type CompletionContext,
  acceptCompletion,
  autocompletion,
  completionKeymap,
  startCompletion,
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

import { type ChromaticPalette } from '@dxos/react-ui';
import { isNotFalsy } from '@dxos/util';

import { type TagPickerItemProps } from './TagPickerItem';

export type TagPickerItemData = {
  id: string;
  label: string;
  hue?: ChromaticPalette;
};

export const createLinks = (items: TagPickerItemData[]) => {
  return items.map(({ id, label }) => `[${label}](${id})`).join('');
};

/**
 * Apply function formats item as link.
 */
export const tagPickerApply = (
  view: EditorView,
  completion: Completion,
  from: number,
  to: number,
  mode?: TagPickerMode,
) => {
  const id = (completion as TagPickerItemData).id;
  const label = completion.label;

  if (mode === 'single-select') {
    // Clear the entire document and replace with just this tag
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: `[${label}](${id})` } });
  } else {
    // Multi-select: just add the tag at cursor
    view.dispatch({ changes: { from, to, insert: `[${label}](${id})` } });
  }

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

export type TagPickerMode = 'single-select' | 'multi-select';

export type TagPickerOptions = {
  debug?: boolean;
  keymap?: boolean;
  removeLabel?: string;
  mode?: TagPickerMode;
  onBlur?: (event: FocusEvent) => void;
  onSelect?: (id: string) => void;
  onSearch?: (text: string, ids: string[]) => TagPickerItemData[];
  onUpdate?: (ids: string[]) => void;
};

/**
 * Uses the markdown parser to parse links, which are decorated as pill buttons.
 */
export const tagPicker = ({
  debug,
  keymap: _keymap = true,
  removeLabel,
  mode = 'multi-select',
  onSelect,
  onSearch,
  onUpdate,
}: TagPickerOptions): Extension => {
  // Ordered list of ids.
  const ids: string[] = [];

  // Range spans for each id.
  const itemSpan = new Map<string, { from: number; to: number }>();

  const handleCompletion = (view: EditorView) => {
    // Try to accept the current completion if one is active.
    if (acceptCompletion(view)) {
      return true;
    }

    // If no completion is active, start one.
    startCompletion(view);
    return true;
  };

  const extensions: Extension[] = [
    keymap.of(completionKeymap),

    _keymap &&
      Prec.highest(
        keymap.of([
          {
            key: 'Tab',
            run: handleCompletion,
            preventDefault: true,
          },
          {
            key: 'Enter',
            run: handleCompletion,
            preventDefault: true,
          },
        ]),
      ),

    // Autocomplete.
    autocompletion({
      activateOnTyping: true,
      closeOnBlur: !debug,
      // tooltipClass: () => 'border border-separator',
      // optionClass: () => '!p-1',
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
                  const originalItem = onSearch?.('', []).find((item) => item.id === id);
                  const item: TagPickerItemData = {
                    id,
                    label: text,
                    hue: originalItem?.hue,
                  };
                  ids.push(id);
                  itemSpan.set(id, { from, to });
                  builder.add(
                    from,
                    to,
                    Decoration.replace({
                      widget: new ItemWidget({
                        itemId: item.id,
                        label: item.label,
                        hue: item.hue,
                        removeLabel,
                        onItemClick: ({ action, itemId }) => {
                          const span = itemSpan.get(itemId);
                          view.focus();
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
                              }
                              break;
                            }
                          }
                          scrollToCursor(view);
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
  ].filter(isNotFalsy);

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
            options: onSearch(match.text.toLowerCase(), ids).map(({ id, label, hue }) => ({
              id,
              label,
              hue,
              apply: (view, completion, from, to) => tagPickerApply(view, completion, from, to, mode),
            })),
          };
        },
      }),
    );
  }

  return extensions;
};

class ItemWidget extends WidgetType {
  private props: TagPickerItemProps;

  constructor(props: TagPickerItemProps) {
    super();
    this.props = props;
  }

  // Prevents re-rendering.
  override eq(widget: this): boolean {
    return widget.props.itemId === this.props.itemId;
  }

  toDOM(): HTMLElement {
    const el = document.createElement('dx-tag-picker-item');
    el.setAttribute('itemId', this.props.itemId ?? 'never');
    el.setAttribute('label', this.props.label ?? 'never');
    el.setAttribute('hue', this.props.hue ?? 'neutral');

    this.props.removeLabel && el.setAttribute('removeLabel', this.props.removeLabel);
    this.props.onItemClick && el.addEventListener('dx-tag-picker-item-click', this.props.onItemClick as any);

    return el;
  }
}

const styles = EditorView.theme({
  // Constrain max width to editor.
  '.cm-tooltip.cm-tooltip-autocomplete': {
    left: '3px !important',
    width: 'var(--dx-tag-picker-width)',
    marginTop: '6.5px',
  },
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
    lineHeight: '1.125rem !important',
  },
});
