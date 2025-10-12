//
// Copyright 2024 DXOS.org
//

import { type Extension, Prec, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, keymap } from '@codemirror/view';

import { type Range } from '../../types';

import { type PlaceholderOptions, placeholder } from './placeholder';

export type CommandMenuOptions = {
  trigger: string | string[];
  placeholder?: Partial<PlaceholderOptions>;

  // TODO(burdon): Replace with onKey?
  onClose?: () => void;
  onArrowDown?: () => void;
  onArrowUp?: () => void;
  onEnter?: () => void;

  onTextChange?: (trigger: string, text: string) => void;
};

export const commandMenu = (options: CommandMenuOptions): Extension => {
  const commandMenuPlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;

      constructor(readonly view: EditorView) {}

      // TODO(wittjosiah): The decorations are repainted on every update, this occasionally causes menu to flicker.
      update(update: ViewUpdate) {
        const builder = new RangeSetBuilder<Decoration>();
        const selection = update.view.state.selection.main;
        const { range: activeRange, trigger } = update.view.state.field(commandMenuState) ?? {};

        // Check if we should show the widget - only if cursor is within the active command range.
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
          tr.effects.some((effect) => effect.is(commandRangeEffect)),
        );
        if (activeRange && activeRangeChanged && trigger) {
          const content = update.view.state.sliceDoc(
            activeRange.from + 1, // Skip the trigger character.
            activeRange.to,
          );
          options.onTextChange?.(trigger, content);
        }

        this.decorations = builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );

  const triggers = Array.isArray(options.trigger) ? options.trigger : [options.trigger];

  const commandKeymap = keymap.of([
    ...triggers.map((trigger) => ({
      key: trigger,
      run: (view: EditorView) => {
        const selection = view.state.selection.main;
        const line = view.state.doc.lineAt(selection.head);
        // Check if we should trigger the command menu:
        // 1. Empty lines or at the beginning of a line
        // 2. When there's a preceding space
        if (
          line.text.trim() === '' ||
          selection.head === line.from ||
          (selection.head > line.from && line.text[selection.head - line.from - 1] === ' ')
        ) {
          // Insert and select the trigger.
          view.dispatch({
            changes: { from: selection.head, insert: trigger },
            selection: { anchor: selection.head + 1, head: selection.head + 1 },
            effects: commandRangeEffect.of({ trigger, range: { from: selection.head, to: selection.head + 1 } }),
          });

          return true;
        }

        return false;
      },
    })),
    {
      key: 'Enter',
      run: (view) => {
        const activeRange = view.state.field(commandMenuState)?.range;
        if (activeRange) {
          view.dispatch({ changes: { from: activeRange.from, to: activeRange.to, insert: '' } });
          options.onEnter?.();
          return true;
        }

        return false;
      },
    },
    {
      key: 'ArrowDown',
      run: (view) => {
        const activeRange = view.state.field(commandMenuState)?.range;
        if (activeRange) {
          options.onArrowDown?.();
          return true;
        }

        return false;
      },
    },
    {
      key: 'ArrowUp',
      run: (view) => {
        const activeRange = view.state.field(commandMenuState)?.range;
        if (activeRange) {
          options.onArrowUp?.();
          return true;
        }

        return false;
      },
    },
  ]);

  // Listen for selection and document changes to clean up the command menu.
  const updateListener = EditorView.updateListener.of((update) => {
    const { trigger, range: activeRange } = update.view.state.field(commandMenuState) ?? {};
    if (!activeRange || !trigger) {
      return;
    }

    const selection = update.view.state.selection.main;
    const firstChar = update.view.state.doc.sliceString(activeRange.from, activeRange.from + 1);
    const shouldRemove =
      firstChar !== trigger || // Trigger deleted.
      selection.head < activeRange.from || // Cursor moved before the range.
      selection.head > activeRange.to + 1; // Cursor moved after the range (+1 to handle selection changing before doc).

    const nextRange = shouldRemove
      ? null
      : update.docChanged
        ? { from: activeRange.from, to: selection.head }
        : activeRange;
    if (nextRange !== activeRange) {
      update.view.dispatch({ effects: commandRangeEffect.of(nextRange ? { trigger, range: nextRange } : null) });
    }

    // TODO(burdon): Should delete if user presses escape? How else to insert the trigger character?
    if (shouldRemove) {
      options.onClose?.();
    }
  });

  return [
    Prec.highest(commandKeymap),
    placeholder(
      Object.assign(
        {
          content: `Press '${Array.isArray(options.trigger) ? options.trigger[0] : options.trigger}' for commands`,
        },
        options.placeholder,
      ),
    ),
    updateListener,
    commandMenuState,
    commandMenuPlugin,
  ];
};

type CommandState = {
  trigger: string;
  range: Range;
};

// State effects for managing command menu state.
export const commandRangeEffect = StateEffect.define<CommandState | null>();

// State field to track the active command menu range.
const commandMenuState = StateField.define<CommandState | null>({
  create: () => null,
  update: (value, tr) => {
    let newValue = value;
    for (const effect of tr.effects) {
      if (effect.is(commandRangeEffect)) {
        newValue = effect.value;
      }
    }

    return newValue;
  },
});
