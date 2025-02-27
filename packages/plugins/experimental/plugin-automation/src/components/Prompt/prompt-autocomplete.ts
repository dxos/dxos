//
// Copyright 2025 DXOS.org
//

import { Prec, type Extension } from '@codemirror/state';
import {
  EditorView,
  Decoration,
  ViewPlugin,
  keymap,
  type DecorationSet,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';

export type AutocompleteOptions = {
  /**
   * Callback triggered when Enter is pressed.
   * @param text The current text in the editor
   */
  onEnter?: (text: string) => void;

  /**
   * Function that returns a list of suggestions based on the current text.
   * @param text The current text before the cursor
   * @returns Array of suggestion strings
   */
  onSuggest?: (text: string) => string[];
};

class InlineSuggestionWidget extends WidgetType {
  constructor(private suffix: string) {
    super();
  }

  override toDOM() {
    const span = document.createElement('span');
    span.textContent = this.suffix;
    span.className = 'cm-inline-suggestion';
    return span;
  }

  override eq(other: InlineSuggestionWidget) {
    return other.suffix === this.suffix;
  }
}

/**
 * Creates an autocomplete extension that shows inline suggestions.
 * Pressing Tab will complete the suggestion.
 */
export const createAutocompleteExtension = ({ onEnter, onSuggest }: AutocompleteOptions): Extension => {
  const suggestionPlugin = ViewPlugin.fromClass(
    class {
      _decorations: DecorationSet;
      _currentSuggestion: string | null = null;

      constructor(view: EditorView) {
        this._decorations = this.computeDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet) {
          this._decorations = this.computeDecorations(update.view);
        }
      }

      private computeDecorations(view: EditorView): DecorationSet {
        const text = view.state.doc.toString();
        const suggestions = onSuggest?.(text) ?? [];
        if (!suggestions.length) {
          this._currentSuggestion = null;
          return Decoration.none;
        }

        // Get the first suggestion.
        this._currentSuggestion = suggestions[0];
        const suffix = this._currentSuggestion.slice(text.length);
        if (!suffix) {
          return Decoration.none;
        }

        // Always show ghost text at the end of the document.
        return Decoration.set([
          Decoration.widget({
            widget: new InlineSuggestionWidget(suffix),
            side: 1,
          }).range(view.state.doc.length),
        ]);
      }

      completeSuggestion(view: EditorView): boolean {
        if (!this._currentSuggestion) {
          return false;
        }

        const text = view.state.doc.toString();
        const suffix = this._currentSuggestion.slice(text.length);
        if (!suffix) {
          return false;
        }

        view.dispatch({
          changes: {
            from: view.state.doc.length,
            insert: suffix,
          },
          selection: {
            anchor: view.state.doc.length + suffix.length,
          },
        });

        return true;
      }
    },
    {
      decorations: (v) => v._decorations,
    },
  );

  return [
    suggestionPlugin,
    EditorView.theme({
      '.cm-inline-suggestion': {
        opacity: 0.4,
      },
    }),

    // Accept the current suggestion.
    Prec.highest(
      keymap.of([
        {
          key: 'Tab',
          run: (view) => {
            const plugin = view.plugin(suggestionPlugin);
            return plugin?.completeSuggestion(view) ?? false;
          },
        },
        {
          key: 'ArrowRight',
          run: (view) => {
            // Only complete if cursor is at the end
            if (view.state.selection.main.head !== view.state.doc.length) {
              return false;
            }

            const plugin = view.plugin(suggestionPlugin);
            return plugin?.completeSuggestion(view) ?? false;
          },
        },
        {
          key: 'Enter',
          preventDefault: true,
          run: (view) => {
            const text = view.state.doc.toString();
            if (onEnter) {
              onEnter(text);
              // Clear the document after calling onEnter
              view.dispatch({
                changes: {
                  from: 0,
                  to: view.state.doc.length,
                  insert: '',
                },
              });
              return true;
            }
            return false;
          },
        },
        {
          key: 'Shift-Enter',
          run: (view) => {
            view.dispatch({
              changes: {
                from: view.state.selection.main.head,
                insert: '\n',
              },
            });
            return true;
          },
        },
        {
          key: 'Escape',
          run: (view) => {
            // Clear the entire document.
            view.dispatch({
              changes: {
                from: 0,
                to: view.state.doc.length,
                insert: '',
              },
            });
            return true;
          },
        },
      ]),
    ),
  ];
};
