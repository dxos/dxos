//
// Copyright 2024 DXOS.org
//

import { RangeSetBuilder, StateField, StateEffect, Prec } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate, Decoration, keymap, type DecorationSet } from '@codemirror/view';
import { type RefObject, useCallback, useMemo, useRef, useState } from 'react';

import { type CleanupFn, addEventListener } from '@dxos/async';
import { type DxRefTag, type DxRefTagActivate } from '@dxos/lit-ui';
import { type MaybePromise } from '@dxos/util';

import { closeEffect, openEffect } from './action';
import { getItem, getNextItem, getPreviousItem, type CommandMenuGroup, type CommandMenuItem } from '../../components';
import { type Range } from '../../types';
import { multilinePlaceholder } from '../placeholder';

export type FloatingMenuOptions = {
  icon?: string;
  height?: number;
  padding?: number;
};

export const floatingMenu = (options: FloatingMenuOptions = {}) => [
  ViewPlugin.fromClass(
    class {
      view: EditorView;
      tag: HTMLElement;
      rafId?: number | null;
      cleanup?: CleanupFn;

      constructor(view: EditorView) {
        this.view = view;

        // Position context.
        const container = view.scrollDOM;
        if (getComputedStyle(container).position === 'static') {
          container.style.position = 'relative';
        }

        {
          const icon = document.createElement('dx-icon');
          icon.setAttribute('icon', options.icon ?? 'ph--dots-three-vertical--regular');

          const button = document.createElement('button');
          button.appendChild(icon);

          this.tag = document.createElement('dx-ref-tag');
          this.tag.classList.add('cm-ref-tag');
          this.tag.appendChild(button);
        }

        container.appendChild(this.tag);

        // Listen for scroll events.
        const handler = () => this.scheduleUpdate();
        this.cleanup = addEventListener(container, 'scroll', handler);
        this.scheduleUpdate();
      }

      destroy() {
        this.cleanup?.();
        this.tag.remove();
        if (this.rafId != null) {
          cancelAnimationFrame(this.rafId);
        }
      }

      update(update: ViewUpdate) {
        this.tag.dataset.focused = update.view.hasFocus ? 'true' : 'false';
        if (!update.view.hasFocus) {
          return;
        }

        // TODO(burdon): Timer to fade in/out.
        if (update.transactions.some((tr) => tr.effects.some((effect) => effect.is(openEffect)))) {
          this.tag.style.display = 'none';
          this.tag.classList.add('opacity-10');
        } else if (update.transactions.some((tr) => tr.effects.some((effect) => effect.is(closeEffect)))) {
          this.tag.style.display = 'block';
        } else if (
          update.docChanged ||
          update.focusChanged ||
          update.geometryChanged ||
          update.selectionSet ||
          update.viewportChanged
        ) {
          this.scheduleUpdate();
        }
      }

      updateButtonPosition() {
        const { x, width } = this.view.contentDOM.getBoundingClientRect();

        const pos = this.view.state.selection.main.head;
        const line = this.view.lineBlockAt(pos);
        const coords = this.view.coordsAtPos(line.from);
        if (!coords) {
          return;
        }

        const lineHeight = coords.bottom - coords.top;
        const dy = (lineHeight - (options.height ?? 32)) / 2;

        const offsetTop = coords.top + dy;
        const offsetLeft = x + width + (options.padding ?? 8);

        this.tag.style.top = `${offsetTop}px`;
        this.tag.style.left = `${offsetLeft}px`;
        this.tag.style.display = 'block';
      }

      scheduleUpdate() {
        if (this.rafId != null) {
          cancelAnimationFrame(this.rafId);
        }

        this.rafId = requestAnimationFrame(this.updateButtonPosition.bind(this));
      }
    },
  ),

  EditorView.theme({
    '.cm-ref-tag': {
      position: 'fixed',
      padding: '0',
      border: 'none',
      opacity: '0',
    },
    '[data-has-focus] & .cm-ref-tag': {
      opacity: '1',
    },
    '[data-is-attention-source] & .cm-ref-tag': {
      opacity: '1',
    },
    '.cm-ref-tag button': {
      display: 'grid',
      alignItems: 'center',
      justifyContent: 'center',
      width: '2rem',
      height: '2rem',
    },
  }),
];

// State effects for managing command menu state.
export const commandRangeEffect = StateEffect.define<Range | null>();

// State field to track the active command menu range.
const commandMenuState = StateField.define<Range | null>({
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

export type CommandMenuOptions = {
  trigger: string;
  placeholder?: Parameters<typeof multilinePlaceholder>[0];
  onArrowDown?: () => void;
  onArrowUp?: () => void;
  onDeactivate?: () => void;
  onEnter?: () => void;
  onTextChange?: (text: string) => void;
};

export const commandMenu = (options: CommandMenuOptions) => {
  const commandMenuPlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;

      constructor(readonly view: EditorView) {}

      // TODO(wittjosiah): The decorations are repainted on every update, this occasionally causes menu to flicker.
      update(update: ViewUpdate) {
        const builder = new RangeSetBuilder<Decoration>();
        const selection = update.view.state.selection.main;
        const activeRange = update.view.state.field(commandMenuState);

        // Check if we should show the widget - only if cursor is within the active command range.
        const shouldShowWidget = activeRange && selection.head >= activeRange.from && selection.head <= activeRange.to;
        if (shouldShowWidget) {
          // Create mark decoration that wraps the entire line content in a dx-ref-tag.
          builder.add(
            activeRange.from,
            activeRange.to,
            Decoration.mark({
              tagName: 'dx-ref-tag',
              class: 'cm-ref-tag',
              attributes: {
                'data-auto-trigger': 'true',
              },
            }),
          );
        }

        const activeRangeChanged = update.transactions.some((tr) =>
          tr.effects.some((effect) => effect.is(commandRangeEffect)),
        );
        if (activeRange && activeRangeChanged) {
          const content = update.view.state.sliceDoc(
            activeRange.from + 1, // Skip the trigger character.
            activeRange.to,
          );
          options.onTextChange?.(content);
        }

        this.decorations = builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );

  const commandKeymap = keymap.of([
    {
      key: options.trigger,
      run: (view) => {
        const selection = view.state.selection.main;
        const line = view.state.doc.lineAt(selection.head);

        // Check if we should trigger the command menu:
        // 1. Empty lines or at the beginning of a line
        // 2. When there's a preceding space
        const shouldTrigger =
          line.text.trim() === '' ||
          selection.head === line.from ||
          (selection.head > line.from && line.text[selection.head - line.from - 1] === ' ');

        if (shouldTrigger) {
          view.dispatch({
            changes: { from: selection.head, insert: options.trigger },
            selection: { anchor: selection.head + 1, head: selection.head + 1 },
            effects: commandRangeEffect.of({ from: selection.head, to: selection.head + 1 }),
          });
          return true;
        }

        return false;
      },
    },
    {
      key: 'Enter',
      run: (view) => {
        const activeRange = view.state.field(commandMenuState);
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
        const activeRange = view.state.field(commandMenuState);
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
        const activeRange = view.state.field(commandMenuState);
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
    const activeRange = update.view.state.field(commandMenuState);
    if (!activeRange) {
      return;
    }

    const selection = update.view.state.selection.main;
    const firstChar = update.view.state.doc.sliceString(activeRange.from, activeRange.from + 1);
    const shouldRemove =
      firstChar !== options.trigger || // Trigger deleted.
      selection.head < activeRange.from || // Cursor moved before the range.
      selection.head > activeRange.to + 1; // Cursor moved after the range (+1 to handle selection changing before doc).

    const nextRange = shouldRemove
      ? null
      : update.docChanged
        ? { from: activeRange.from, to: selection.head }
        : activeRange;
    if (nextRange !== activeRange) {
      update.view.dispatch({ effects: commandRangeEffect.of(nextRange) });
    }

    if (shouldRemove) {
      options.onDeactivate?.();
    }
  });

  return [
    multilinePlaceholder(options.placeholder ?? `Press '${options.trigger}' for commands`),
    Prec.highest(commandKeymap),
    updateListener,
    commandMenuState,
    commandMenuPlugin,
  ];
};

export type UseCommandMenuOptions = {
  viewRef: RefObject<EditorView | undefined>;
  trigger: string;
  getGroups: (query?: string) => MaybePromise<CommandMenuGroup[]>;
};

export const useCommandMenu = ({ viewRef, trigger, getGroups }: UseCommandMenuOptions) => {
  const triggerRef = useRef<DxRefTag | null>(null);
  const currentRef = useRef<CommandMenuItem | null>(null);
  const groupsRef = useRef<CommandMenuGroup[]>([]);
  const [currentItem, setCurrentItem] = useState<string>();
  const [open, setOpen] = useState(false);
  const [_, update] = useState({});

  const handleOpenChange = useCallback(async (open: boolean) => {
    if (open) {
      groupsRef.current = await getGroups();
    }
    setOpen(open);
    if (!open) {
      triggerRef.current = null;
      setCurrentItem(undefined);
      viewRef.current?.dispatch({ effects: [commandRangeEffect.of(null)] });
    }
  }, []);

  const handleActivate = useCallback(
    async (event: DxRefTagActivate) => {
      const item = getItem(groupsRef.current, currentItem);
      if (item) {
        currentRef.current = item;
      }

      triggerRef.current = event.trigger;
      if (!open) {
        await handleOpenChange(true);
      }
    },
    [open],
  );

  const handleSelect = useCallback((item: CommandMenuItem) => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    const selection = view.state.selection.main;
    void item.onSelect?.(view, selection.head);
  }, []);

  const _commandMenu = useMemo(
    () =>
      commandMenu({
        trigger,
        onArrowDown: () => {
          setCurrentItem((currentItem) => {
            const next = getNextItem(groupsRef.current, currentItem);
            currentRef.current = next;
            return next.id;
          });
        },
        onArrowUp: () => {
          setCurrentItem((currentItem) => {
            const previous = getPreviousItem(groupsRef.current, currentItem);
            currentRef.current = previous;
            return previous.id;
          });
        },
        onDeactivate: () => handleOpenChange(false),
        onEnter: () => {
          if (currentRef.current) {
            handleSelect(currentRef.current);
          }
        },
        onTextChange: async (text) => {
          groupsRef.current = await getGroups(text);
          const firstItem = groupsRef.current.filter((group) => group.items.length > 0)[0]?.items[0];
          if (firstItem) {
            setCurrentItem(firstItem.id);
            currentRef.current = firstItem;
          }
          update({});
        },
      }),
    [handleOpenChange, trigger],
  );

  return {
    commandMenu: _commandMenu,
    currentItem,
    groupsRef,
    ref: triggerRef,
    open,
    onActivate: handleActivate,
    onOpenChange: setOpen,
    onSelect: handleSelect,
  };
};
