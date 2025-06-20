//
// Copyright 2024 DXOS.org
//

import { RangeSetBuilder, StateField, StateEffect, Prec } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate, Decoration, keymap, type DecorationSet } from '@codemirror/view';
import { type RefObject, useCallback, useMemo, useRef, useState } from 'react';

import { type CleanupFn, addEventListener } from '@dxos/async';
import { type DxRefTag, type DxRefTagActivate } from '@dxos/lit-ui';

import { closeEffect, openEffect } from './action';
import {
  coreSlashCommands,
  filterItems,
  getItem,
  getNextItem,
  getPreviousItem,
  type SlashCommandGroup,
  type SlashCommandItem,
} from '../../components';
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

// State effects for managing slash menu state.
export const slashLineEffect = StateEffect.define<number | null>();

// State field to track which line the slash menu is active on.
const slashMenuState = StateField.define<number | null>({
  create: () => null,
  update: (value, tr) => {
    let newValue = value;

    // Apply effects.
    for (const effect of tr.effects) {
      if (effect.is(slashLineEffect)) {
        newValue = effect.value;
      }
    }

    return newValue;
  },
});

export type SlashMenuOptions = {
  placeholder?: Parameters<typeof multilinePlaceholder>[0];
  onArrowDown?: () => void;
  onArrowUp?: () => void;
  onDeactivate?: () => void;
  onEnter?: () => void;
  onTextChange?: (text: string) => void;
};

export const slashMenu = (options: SlashMenuOptions = {}) => {
  const slashMenuPlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;

      constructor(readonly view: EditorView) {}

      update(update: ViewUpdate) {
        const builder = new RangeSetBuilder<Decoration>();
        const selection = update.view.state.selection.main;
        const line = update.view.state.doc.lineAt(selection.head);
        const activeSlashLine = update.view.state.field(slashMenuState);

        // Check if we should show the widget - only if this line is in the active slash lines set.
        const shouldShowWidget = activeSlashLine === line.number && line.text.startsWith('/');

        if (shouldShowWidget) {
          const slashPos = line.from;
          const contentStart = slashPos + 1;
          const content = update.view.state.sliceDoc(contentStart, line.to);

          // Create mark decoration that wraps the entire line content in a dx-ref-tag.
          builder.add(
            slashPos,
            line.to,
            Decoration.mark({
              tagName: 'dx-ref-tag',
              class: 'cm-ref-tag',
              attributes: {
                'data-auto-trigger': 'true',
              },
            }),
          );

          if (update.docChanged) {
            options.onTextChange?.(content);
          }
        }

        this.decorations = builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );

  const slashKeymap = keymap.of([
    {
      key: '/',
      run: (view) => {
        const selection = view.state.selection.main;
        const line = view.state.doc.lineAt(selection.head);

        // Only trigger on empty lines or at the beginning of a line.
        if (line.text.trim() === '' || selection.head === line.from) {
          // Insert the slash character.
          view.dispatch({
            changes: { from: selection.head, insert: '/' },
            selection: { anchor: selection.head + 1, head: selection.head + 1 },
            effects: slashLineEffect.of(line.number),
          });
          return true;
        }

        return false;
      },
    },
    {
      key: 'Enter',
      run: (view) => {
        const activeSlashLine = view.state.field(slashMenuState);
        if (activeSlashLine !== null) {
          const selection = view.state.selection.main;
          const currentLine = view.state.doc.lineAt(selection.head);
          // Clear the current line.
          view.dispatch({
            changes: { from: currentLine.from, to: currentLine.to, insert: '' },
          });

          // Check if cursor is on the active slash line.
          if (currentLine.number === activeSlashLine && currentLine.text.startsWith('/')) {
            options.onEnter?.();
            return true;
          }
        }

        return false;
      },
    },
    {
      key: 'ArrowDown',
      run: (view) => {
        const activeSlashLine = view.state.field(slashMenuState);
        if (activeSlashLine !== null) {
          options.onArrowDown?.();
          return true;
        }

        return false;
      },
    },
    {
      key: 'ArrowUp',
      run: (view) => {
        const activeSlashLine = view.state.field(slashMenuState);
        if (activeSlashLine !== null) {
          options.onArrowUp?.();
          return true;
        }

        return false;
      },
    },
  ]);

  // Listen for selection and document changes to clean up the slash menu.
  const updateListener = EditorView.updateListener.of((update) => {
    const activeSlashLine = update.view.state.field(slashMenuState);

    if (activeSlashLine !== null) {
      const line = update.view.state.doc.line(activeSlashLine);
      const selection = update.view.state.selection.main;
      const currentLine = update.view.state.doc.lineAt(selection.head);

      // Check if we should remove the slash menu.
      const shouldRemove =
        !line.text.startsWith('/') || // Line no longer starts with '/'.
        currentLine.number !== activeSlashLine; // Cursor moved to different line.

      if (shouldRemove) {
        update.view.dispatch({
          effects: slashLineEffect.of(null),
        });
        options.onDeactivate?.();
      }
    }
  });

  return [
    multilinePlaceholder(options.placeholder ?? "Press '/' for commands"),
    Prec.highest(slashKeymap),
    updateListener,
    slashMenuState,
    slashMenuPlugin,
  ];
};

export const useSlashMenu = (viewRef: RefObject<EditorView | undefined>, groups?: SlashCommandGroup[]) => {
  const defaultGroups = useMemo(() => [coreSlashCommands, ...(groups ?? [])], [groups]);
  const triggerRef = useRef<DxRefTag | null>(null);
  const [open, setOpen] = useState(false);
  const [_, update] = useState({});
  const [currentItem, setCurrentItem] = useState(coreSlashCommands.items[0].id);
  const currentRef = useRef<SlashCommandItem | null>(null);
  const groupsRef = useRef<SlashCommandGroup[]>(defaultGroups);

  const handleOpenChange = useCallback((open: boolean) => {
    setOpen(open);
    if (!open) {
      setCurrentItem(coreSlashCommands.items[0].id);
      triggerRef.current = null;
      groupsRef.current = defaultGroups;
      viewRef.current?.dispatch({ effects: [slashLineEffect.of(null)] });
    }
  }, []);

  const handleActivate = useCallback((event: DxRefTagActivate) => {
    const item = getItem(groupsRef.current, currentItem);
    if (item) {
      currentRef.current = item;
    }

    triggerRef.current = event.trigger;
    handleOpenChange(true);
  }, []);

  const handleSelect = useCallback((item: SlashCommandItem) => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    const selection = view.state.selection.main;
    const line = view.state.doc.lineAt(selection.head);
    void item.onSelect?.(view, line);
  }, []);

  const _slashMenu = useMemo(
    () =>
      slashMenu({
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
        onDeactivate: () => {
          handleOpenChange(false);
        },
        onEnter: () => {
          if (currentRef.current) {
            handleSelect(currentRef.current);
          }
        },
        onTextChange: (text) => {
          groupsRef.current = filterItems(defaultGroups, (item) =>
            item.label.toLowerCase().includes(text.toLowerCase()),
          );
          update({});
        },
      }),
    [handleOpenChange],
  );

  return {
    slashMenu: _slashMenu,
    currentItem,
    groupsRef,
    ref: triggerRef,
    open,
    onActivate: handleActivate,
    onOpenChange: setOpen,
    onSelect: handleSelect,
  };
};
