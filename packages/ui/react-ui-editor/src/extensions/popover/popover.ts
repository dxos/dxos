//
// Copyright 2024 DXOS.org
//

import { type Extension, Prec, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, keymap } from '@codemirror/view';

import { type Range } from '../../types';
import { type PlaceholderOptions, placeholder } from '../autocomplete';

export type PopoverOptions = {
  trigger: string | string[];
  placeholder?: Partial<PlaceholderOptions>;

  // Trigger update.
  onTextChange?: (trigger: string, text: string) => void;
  onClose?: () => void;

  // Menu specific.
  // TODO(burdon): Handle Escape.
  onEnter?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
};

/**
 * Creates a popover that appears when the trigger character is inserted.
 * This can be used for context menus or autocompletion.
 */
export const popover = (options: PopoverOptions): Extension => {
  return [
    Prec.highest(popoverKeymap(options)),
    popoverStateField,
    popoverTriggerListener(options),
    popoverAnchorDecoration(options),
    placeholder({
      // TODO(burdon): Translations.
      content: `Press '${Array.isArray(options.trigger) ? options.trigger[0] : options.trigger}' for commands`,
      ...options.placeholder,
    }),
  ];
};

/**
 * Listen for selection and document changes.
 */
const popoverTriggerListener = (options: PopoverOptions) =>
  EditorView.updateListener.of(({ view, docChanged }) => {
    const { trigger, range: activeRange } = view.state.field(popoverStateField) ?? {};
    if (!activeRange || !trigger) {
      return;
    }

    const selection = view.state.selection.main;
    const char = view.state.doc.sliceString(activeRange.from, activeRange.from + 1);
    const shouldRemove =
      // Trigger deleted.
      char !== trigger ||
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

/**
 * Popover navigation.
 */
const popoverKeymap = (options: PopoverOptions) => {
  const triggers = Array.isArray(options.trigger) ? options.trigger : [options.trigger];
  return keymap.of([
    ...triggers.map((trigger) => ({
      key: trigger,
      run: (view: EditorView) => {
        // Determine if we should trigger the popover:
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
      key: 'ArrowUp',
      run: (view) => {
        const range = view.state.field(popoverStateField)?.range;
        if (range) {
          options.onArrowUp?.();
          return true;
        }

        return false;
      },
    },
    {
      key: 'ArrowDown',
      run: (view) => {
        const range = view.state.field(popoverStateField)?.range;
        if (range) {
          options.onArrowDown?.();
          return true;
        }

        return false;
      },
    },
    {
      key: 'Enter',
      run: (view) => {
        const range = view.state.field(popoverStateField)?.range;
        if (range) {
          view.dispatch({ changes: { from: range.from, to: range.to, insert: '' } });
          options.onEnter?.();
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
const popoverAnchorDecoration = (options: PopoverOptions) => {
  return ViewPlugin.fromClass(
    class {
      _decorations: DecorationSet = Decoration.none;

      constructor(readonly view: EditorView) {}

      // TODO(wittjosiah): The decorations are repainted on every update, this occasionally causes menu to flicker.
      update({ view, transactions }: ViewUpdate) {
        const { range, trigger } = view.state.field(popoverStateField) ?? {};

        // Check if we should show the widget (only if cursor is within the active command range).
        const selection = view.state.selection.main;
        const showWidget = range && selection.head >= range.from && selection.head <= range.to;

        const builder = new RangeSetBuilder<Decoration>();
        if (showWidget) {
          // Create decoration that wraps the entire line content in a dx-anchor.
          builder.add(
            range.from,
            range.to,
            Decoration.mark({
              tagName: 'dx-anchor',
              class: 'cm-popover-trigger',
              attributes: {
                'data-visible-focus': 'false',
                'data-auto-trigger': 'true',
                'data-trigger': trigger!,
              },
            }),
          );
        }

        const rangeChanged = transactions.some((tr) => tr.effects.some((effect) => effect.is(popoverRangeEffect)));
        if (range && rangeChanged && trigger) {
          // NOTE: Content skips the trigger character.
          const content = view.state.sliceDoc(range.from + 1, range.to);
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

// State effects for managing popover state.
export const popoverRangeEffect = StateEffect.define<PopoverState | null>();

// State field to track the active popover trigger range.
const popoverStateField = StateField.define<PopoverState | null>({
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
