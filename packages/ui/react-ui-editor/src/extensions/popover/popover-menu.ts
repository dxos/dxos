//
// Copyright 2024 DXOS.org
//

import { type Extension, Prec, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, keymap } from '@codemirror/view';

import { type Range } from '../../types';
import { type PlaceholderOptions, placeholder } from '../autocomplete';

export type PopoverMenuOptions = {
  trigger: string | string[];
  placeholder?: Partial<PlaceholderOptions>;

  // TODO(burdon): Replace with onKey?
  onClose?: () => void;

  // TOOD(burdon): Menu specific.
  onEnter?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onTextChange?: (trigger: string, text: string) => void;
};

/**
 * Creates a popover menu that appears when the trigger character is inserted.
 * This can be used for context menus or autocompletion.
 */
// TODO(burdon): Factor out popover vs. menu.
export const popoverMenu = (options: PopoverMenuOptions): Extension => {
  // Listen for selection and document changes to clean up the command menu.
  const updateListener = EditorView.updateListener.of(({ view, docChanged }) => {
    const { trigger, range: activeRange } = view.state.field(popoverState) ?? {};
    if (!activeRange || !trigger) {
      return;
    }

    const selection = view.state.selection.main;
    const firstChar = view.state.doc.sliceString(activeRange.from, activeRange.from + 1);
    const shouldRemove =
      // Trigger deleted.
      firstChar !== trigger ||
      // Cursor moved before the range.
      selection.head < activeRange.from ||
      // Cursor moved after the range (+1 to handle selection changing before doc).
      selection.head > activeRange.to + 1;

    const nextRange = shouldRemove ? null : docChanged ? { from: activeRange.from, to: selection.head } : activeRange;
    if (nextRange !== activeRange) {
      view.dispatch({ effects: popoverRangeEffect.of(nextRange ? { trigger, range: nextRange } : null) });
    }

    // TODO(burdon): Should delete if user presses escape? How else to insert the trigger character?
    if (shouldRemove) {
      options.onClose?.();
    }
  });

  return [
    Prec.highest(popoverKeymap(options)),
    popoverAnchorDecoration(options),
    popoverState,
    updateListener,
    placeholder(
      Object.assign(
        {
          content: `Press '${Array.isArray(options.trigger) ? options.trigger[0] : options.trigger}' for commands`,
        },
        options.placeholder,
      ),
    ),
  ];
};

const popoverKeymap = (options: PopoverMenuOptions) => {
  const triggers = Array.isArray(options.trigger) ? options.trigger : [options.trigger];
  return keymap.of([
    ...triggers.map((trigger) => ({
      key: trigger,
      run: (view: EditorView) => {
        // Determine if we should trigger the popover menu:
        // 1. Empty lines or at the beginning of a line
        // 2. When there's a preceding space
        const from = view.state.selection.main.head;
        const line = view.state.doc.lineAt(from);
        if (
          line.text.trim() === '' ||
          from === line.from ||
          (from > line.from && line.text[from - line.from - 1] === ' ')
        ) {
          // Insert and select the trigger.
          view.dispatch({
            changes: { from, insert: trigger },
            selection: { anchor: from + 1, head: from + 1 },
            effects: popoverRangeEffect.of({ trigger, range: { from, to: from + 1 } }),
          });

          return true;
        }

        return false;
      },
    })),

    {
      key: 'Enter',
      run: (view) => {
        const activeRange = view.state.field(popoverState)?.range;
        if (activeRange) {
          view.dispatch({ changes: { from: activeRange.from, to: activeRange.to, insert: '' } });
          options.onEnter?.();
          return true;
        }

        return false;
      },
    },
    {
      key: 'ArrowUp',
      run: (view) => {
        const activeRange = view.state.field(popoverState)?.range;
        if (activeRange) {
          options.onArrowUp?.();
          return true;
        }

        return false;
      },
    },
    {
      key: 'ArrowDown',
      run: (view) => {
        const activeRange = view.state.field(popoverState)?.range;
        if (activeRange) {
          options.onArrowDown?.();
          return true;
        }

        return false;
      },
    },
  ]);
};

/**
 * Creates a <dx-anchor> tag, which is used to anchor the Popver.
 */
const popoverAnchorDecoration = (options: PopoverMenuOptions) => {
  return ViewPlugin.fromClass(
    class {
      _decorations: DecorationSet = Decoration.none;

      constructor(readonly view: EditorView) {}

      // TODO(wittjosiah): The decorations are repainted on every update, this occasionally causes menu to flicker.
      update(update: ViewUpdate) {
        const builder = new RangeSetBuilder<Decoration>();
        const selection = update.view.state.selection.main;
        const { range: activeRange, trigger } = update.view.state.field(popoverState) ?? {};

        // Check if we should show the widget (only if cursor is within the active command range).
        const shouldShowWidget = activeRange && selection.head >= activeRange.from && selection.head <= activeRange.to;
        if (shouldShowWidget) {
          // Create mark decoration that wraps the entire line content in a dx-anchor.
          builder.add(
            activeRange.from,
            activeRange.to,
            Decoration.mark({
              tagName: 'dx-anchor',
              class: 'cm-floating-menu-trigger',
              attributes: {
                'data-visible-focus': 'false',
                'data-auto-trigger': 'true',
                'data-trigger': trigger!,
              },
            }),
          );
        }

        const activeRangeChanged = update.transactions.some((tr) =>
          tr.effects.some((effect) => effect.is(popoverRangeEffect)),
        );

        if (activeRange && activeRangeChanged && trigger) {
          const content = update.view.state.sliceDoc(
            activeRange.from + 1, // Skip the trigger character.
            activeRange.to,
          );
          options.onTextChange?.(trigger, content);
        }

        this._decorations = builder.finish();
      }
    },
    {
      decorations: (v) => v._decorations,
    },
  );
};

type PopoverState = {
  trigger: string;
  range: Range;
};

// State effects for managing popover menu state.
export const popoverRangeEffect = StateEffect.define<PopoverState | null>();

// State field to track the active popover menu range.
const popoverState = StateField.define<PopoverState | null>({
  create: () => null,
  update: (value, tr) => {
    let newValue = value;
    for (const effect of tr.effects) {
      if (effect.is(popoverRangeEffect)) {
        newValue = effect.value;
      }
    }

    return newValue;
  },
});
