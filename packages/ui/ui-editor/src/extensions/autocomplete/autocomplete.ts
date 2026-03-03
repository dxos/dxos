//
// Copyright 2025 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
  keymap,
} from '@codemirror/view';

export type AutocompleteOptions = {
  /**
   * Function that returns a list of suggestions based on the current text.
   * @param text The current text before the cursor
   * @returns Array of suggestion strings
   */
  onSuggest?: (text: string) => string[];
};

/**
 * Creates an autocomplete extension that shows inline suggestions.
 * Pressing Tab will complete the suggestion.
 *
 * @deprecated Use typeahead.
 */
export const autocomplete = ({ onSuggest }: AutocompleteOptions = {}): Extension => {
  const suggest = ViewPlugin.fromClass(
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
    suggest,
    EditorView.theme({
      '.cm-inline-suggestion': {
        opacity: 0.4,
      },
    }),

    Prec.highest(
      keymap.of([
        {
          key: 'Tab',
          preventDefault: true,
          run: (view) => {
            const plugin = view.plugin(suggest);
            return plugin?.completeSuggestion(view) ?? false;
          },
        },
        {
          key: 'ArrowRight',
          preventDefault: true,
          run: (view) => {
            // Only complete if cursor is at the end
            if (view.state.selection.main.head !== view.state.doc.length) {
              return false;
            }

            const plugin = view.plugin(suggest);
            return plugin?.completeSuggestion(view) ?? false;
          },
        },
      ]),
    ),
  ];
};

class InlineSuggestionWidget extends WidgetType {
  constructor(private suffix: string) {
    super();
  }

  override eq(other: this) {
    return this.suffix === other.suffix;
  }

  override toDOM() {
    const span = document.createElement('span');
    span.textContent = this.suffix;
    span.className = 'cm-inline-suggestion';
    return span;
  }
}
