//
// Copyright 2024 DXOS.org
//

import { type Extension, Prec, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  type KeyBinding,
  ViewPlugin,
  type ViewUpdate,
  keymap,
} from '@codemirror/view';

import { isNonNullable, isTruthy } from '@dxos/util';

import { type Range } from '../../types';
import { type PlaceholderOptions, placeholder } from '../autocomplete';

import { modalStateField } from './modal';

export type PopoverOptions = {
  trigger?: string | string[];
  triggerKey?: string;
  placeholder?: Partial<PlaceholderOptions>;

  // TODO(burdon): Auto.
  // activateOnTyping?: boolean;

  // Trigger update.
  onTextChange?: (text: string, trigger?: string) => void;
  onClose?: (event: { view: EditorView }) => void;

  // Menu specific.
  onEnter?: (event: { view: EditorView }) => void;
  onArrowUp?: (event: { view: EditorView }) => void;
  onArrowDown?: (event: { view: EditorView }) => void;
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
    modalStateField,
    options.trigger &&
      placeholder({
        // TODO(burdon): Translations.
        content: `Press '${Array.isArray(options.trigger) ? options.trigger[0] : options.trigger}' for commands`,
        ...options.placeholder,
      }),
  ].filter(isTruthy);
};

/**
 * Listen for selection and document changes.
 */
const popoverTriggerListener = (options: PopoverOptions) =>
  EditorView.updateListener.of(({ view, docChanged }) => {
    const { range: activeRange, trigger } = view.state.field(popoverStateField) ?? {};
    if (!activeRange) {
      return;
    }

    const text = view.state.doc.sliceString(activeRange.from, activeRange.to);
    const selection = view.state.selection.main;
    const shouldClose =
      // Trigger deleted.
      (trigger ? trigger !== text[0] : text.length === 0) ||
      // Whitespace in text.
      /\W/.test(trigger ? text.slice(1) : text) ||
      // Cursor moved before the range.
      selection.head < activeRange.from ||
      // Cursor moved after the range (+1 to handle selection changing before doc).
      selection.head > activeRange.to + 1;

    const nextRange = shouldClose ? null : docChanged ? { from: activeRange.from, to: selection.head } : activeRange;
    if (nextRange !== activeRange) {
      view.dispatch({
        effects: popoverRangeEffect.of(nextRange ? { range: nextRange, trigger } : null),
      });
    }

    if (shouldClose) {
      options.onClose?.({ view });
    }
  });

/**
 * Popover navigation.
 */
const popoverKeymap = (options: PopoverOptions) => {
  const triggers = Array.isArray(options.trigger) ? options.trigger : [options.trigger];
  return keymap.of(
    [
      // Prefix triggers.
      ...triggers.filter(isNonNullable).map((trigger) => ({
        key: trigger,
        run: (view: EditorView) => {
          // Determine if we should trigger the popover:
          // 1. Empty lines or at the beginning of a line
          // 2. When there's a preceding space
          const selection = view.state.selection.main;
          const line = view.state.doc.lineAt(selection.head);
          if (
            line.text.trim() === '' ||
            selection.head === line.from ||
            (selection.head > line.from && line.text[selection.head - line.from - 1] === ' ')
          ) {
            // Insert and select the trigger.
            view.dispatch({
              changes: { from: selection.head, insert: trigger },
              selection: { anchor: selection.head + 1, head: selection.head + 1 },
              effects: popoverRangeEffect.of({ trigger, range: { from: selection.head, to: selection.head + 1 } }),
            });

            return true;
          }

          return false;
        },
      })),

      //
      // Custom trigger.
      //
      options.triggerKey &&
        ({
          key: options.triggerKey,
          run: (view: EditorView) => {
            const selection = view.state.selection.main;
            const line = view.state.doc.lineAt(selection.head);

            // Get last word.
            let str = line.text.slice(0, selection.head - line.from);
            const idx = str.lastIndexOf(' ');
            if (idx !== -1) {
              str = str.slice(idx + 1);
            }

            if (str.trim().length) {
              const from = line.from + idx;
              view.dispatch({
                effects: popoverRangeEffect.of({ range: { from: from + 1, to: selection.head } }),
              });
              return true;
            }

            return false;
          },
        } satisfies KeyBinding),

      //
      // Nav keys.
      //
      {
        key: 'ArrowUp',
        run: (view: EditorView) => {
          const range = view.state.field(popoverStateField)?.range;
          if (range) {
            options.onArrowUp?.({ view });
            return true;
          }

          return false;
        },
      },
      {
        key: 'ArrowDown',
        run: (view: EditorView) => {
          const range = view.state.field(popoverStateField)?.range;
          if (range) {
            options.onArrowDown?.({ view });
            return true;
          }

          return false;
        },
      },
      {
        key: 'Enter',
        run: (view: EditorView) => {
          const range = view.state.field(popoverStateField)?.range;
          if (range) {
            view.dispatch({ changes: { from: range.from, to: range.to, insert: '' } });
            options.onEnter?.({ view });
            return true;
          }

          return false;
        },
      },
    ].filter(isTruthy),
  );
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
        const builder = new RangeSetBuilder<Decoration>();
        const { range, trigger } = view.state.field(popoverStateField) ?? {};
        if (range) {
          // Check if we should show the widget (only if cursor is within the active command range).
          const selection = view.state.selection.main;
          const showWidget = selection.head >= range.from && selection.head <= range.to;
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
                  'data-trigger': trigger ?? options.triggerKey ?? '',
                },
              }),
            );
          }

          const rangeChanged = transactions.some((tr) => tr.effects.some((effect) => effect.is(popoverRangeEffect)));
          if (rangeChanged) {
            // NOTE: Content skips the trigger character.
            const content = view.state.sliceDoc(range.from + (trigger ? trigger.length : 0), range.to);
            options.onTextChange?.(content, trigger);
          }
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
  /**
   * Trigger prefix (in document).
   */
  trigger?: string;

  /**
   * Current document completion range.
   */
  range: Range;
};

// State effects for managing popover state.
export const popoverRangeEffect = StateEffect.define<PopoverState | null>();

// State field to track the active popover trigger range.
export const popoverStateField = StateField.define<PopoverState | null>({
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
