//
// Copyright 2026 DXOS.org
//

import { type Scope, type Service, createMachine } from '@zag-js/core';

/**
 * Roving focus for `role=toolbar` (decision 9): one item is tabbable and arrow keys, Home and End move between items.
 * Framework-neutral: the machine and `connect` import no React, so a Solid binding reuses both.
 */

export type Orientation = 'horizontal' | 'vertical';

export type ToolbarProps = {
  id: string;
  orientation?: Orientation;
  /** Wrap from the last item to the first and back. */
  loop?: boolean;
  /** Disables every item, so the toolbar has no tab stop. */
  disabled?: boolean;
};

type Direction = 'next' | 'prev' | 'first' | 'last';

export type ToolbarSchema = {
  state: 'idle';
  props: ToolbarProps;
  context: { focusedValue: string | null };
  event: { type: 'ITEM.FOCUS'; value: string } | { type: 'NAVIGATE'; direction: Direction };
  action: 'setFocusedValue' | 'focusItem' | 'initFocusedValue';
};

export type ToolbarService = Service<ToolbarSchema>;

const getRootId = (scope: Scope) => `toolbar:${scope.id}`;

/** Items owned by this toolbar only, so a nested toolbar keeps its own roving set. */
const getItems = (scope: Scope): HTMLElement[] => {
  const root = scope.getById(getRootId(scope));
  if (!root) {
    return [];
  }
  return Array.from(root.querySelectorAll<HTMLElement>(`[data-toolbar-item="${getRootId(scope)}"]`)).filter(
    (element) => !element.hasAttribute('disabled') && !element.hasAttribute('data-disabled'),
  );
};

export const machine = createMachine<ToolbarSchema>({
  props: ({ props }) => ({ orientation: 'horizontal', loop: true, id: '', ...props }),

  initialState: () => 'idle',

  context: ({ bindable }) => ({
    focusedValue: bindable<string | null>(() => ({ defaultValue: null })),
  }),

  entry: ['initFocusedValue'],

  states: {
    idle: {
      on: {
        'ITEM.FOCUS': { actions: ['setFocusedValue'] },
        'NAVIGATE': { actions: ['focusItem'] },
      },
    },
  },

  implementations: {
    actions: {
      initFocusedValue: ({ context, scope }) => {
        const [first] = getItems(scope);
        context.set('focusedValue', first?.dataset.value ?? null);
      },

      setFocusedValue: ({ context, event }) => {
        if (event.type === 'ITEM.FOCUS') {
          context.set('focusedValue', event.value);
        }
      },

      focusItem: ({ event, scope, prop }) => {
        if (event.type !== 'NAVIGATE') {
          return;
        }
        const items = getItems(scope);
        if (items.length === 0) {
          return;
        }
        const active = scope.getActiveElement();
        const index = items.findIndex((item) => item === active || (active !== null && item.contains(active)));
        const last = items.length - 1;
        const loop = prop('loop');
        const target = (() => {
          switch (event.direction) {
            case 'first':
              return 0;
            case 'last':
              return last;
            case 'next':
              return index >= last ? (loop ? 0 : last) : index + 1;
            case 'prev':
              return index <= 0 ? (loop ? last : 0) : index - 1;
          }
        })();
        items[target]?.focus();
      },
    },
  },
});

/** Keyboard event fields the root handler reads; a React or DOM event both satisfy it. */
type KeyEvent = { key: string; target: EventTarget | null; preventDefault: () => void };

// Arrow, Home and End keys belong to a text field's caret, so they never move focus out of one.
const isTextEntry = (target: EventTarget | null) =>
  target instanceof HTMLTextAreaElement ||
  (target instanceof HTMLElement && target.isContentEditable) ||
  (target instanceof HTMLInputElement && !['button', 'checkbox', 'radio', 'submit', 'reset'].includes(target.type));

export type ToolbarApi = {
  focusedValue: string | null;
  orientation: Orientation;
  disabled: boolean;
  getRootProps: () => {
    'id': string;
    'role': 'toolbar';
    'aria-orientation': Orientation;
    'aria-disabled'?: true;
    'data-disabled'?: '';
    'data-scope': 'toolbar';
    'data-part': 'root';
    'data-orientation': Orientation;
    'onKeyDown': (event: KeyEvent) => void;
  };
  /** No `id`: items are found by `data-toolbar-item`, so a composing machine (Select, Tooltip) keeps its own ids. */
  getItemProps: (options: { value: string; disabled?: boolean }) => {
    /** Present only while the whole toolbar is disabled, so it never re-enables an item disabled on its own. */
    'disabled'?: true;
    'tabIndex': number;
    'data-toolbar-item': string;
    'data-value': string;
    'onFocus': () => void;
  };
};

export const connect = (service: ToolbarService): ToolbarApi => {
  const { context, prop, scope, send } = service;
  const focusedValue = context.get('focusedValue');
  const orientation = prop('orientation') ?? 'horizontal';
  const rootDisabled = !!prop('disabled');
  const keys: Record<string, Direction> =
    orientation === 'horizontal'
      ? { ArrowRight: 'next', ArrowLeft: 'prev', Home: 'first', End: 'last' }
      : { ArrowDown: 'next', ArrowUp: 'prev', Home: 'first', End: 'last' };

  return {
    focusedValue,
    orientation,
    disabled: rootDisabled,
    getRootProps: () => ({
      'id': getRootId(scope),
      'role': 'toolbar',
      'aria-orientation': orientation,
      ...(rootDisabled && { 'aria-disabled': true as const, 'data-disabled': '' as const }),
      'data-scope': 'toolbar',
      'data-part': 'root',
      'data-orientation': orientation,
      'onKeyDown': (event) => {
        const direction = keys[event.key];
        if (!direction || isTextEntry(event.target)) {
          return;
        }
        event.preventDefault();
        send({ type: 'NAVIGATE', direction });
      },
    }),
    getItemProps: ({ value, disabled }) => ({
      ...(rootDisabled && { disabled: true as const }),
      // Until an item is known every item stays tabbable, so the toolbar is never unreachable.
      'tabIndex': disabled || rootDisabled ? -1 : focusedValue === null || focusedValue === value ? 0 : -1,
      'data-toolbar-item': getRootId(scope),
      'data-value': value,
      'onFocus': () => send({ type: 'ITEM.FOCUS', value }),
    }),
  };
};
