//
// Copyright 2026 DXOS.org
//

//
// SPIKE. A machine authored with zag's `createMachine`, probing the "machines are capabilities"
// direction (docs/DESIGN.md "Typed binding and modules", TASKS.md zag-adoption decision): the
// definition is plain data — states × events → named actions over bindable context — so it sits
// where `MachineDef` sits today, framework-free by construction. The runtime is the adapter's
// (`@zag-js/react` in components, `@zag-js/vanilla` in tests); nothing here may import React.
//

import { type Service, createMachine } from '@zag-js/core';

const EMPTY_SELECTION: ReadonlySet<string> = new Set();

export type MultiSelectProps = {
  /** Ordered ids, giving EXTEND its extent; without them a range gesture degrades to a toggle. */
  items?: readonly string[];
  /** Observe committed selections — the capability's outward edge. */
  onChange?: (details: { selection: ReadonlySet<string> }) => void;
};

export type MultiSelectContext = {
  selection: ReadonlySet<string>;
  /** The last plainly- or shift-selected id; EXTEND ranges from here. */
  anchor: string | undefined;
};

export type MultiSelectEvent =
  | { type: 'SELECT'; id: string; shift?: boolean }
  | { type: 'EXTEND'; id: string }
  | { type: 'CLEAR' };

export type MultiSelectSchema = {
  state: 'idle';
  props: MultiSelectProps;
  context: MultiSelectContext;
  event: MultiSelectEvent;
  action: 'replace' | 'toggle' | 'extend' | 'clear';
  guard: 'isShift';
};

export type MultiSelectService = Service<MultiSelectSchema>;

const setEquals = (a: ReadonlySet<string>, b: ReadonlySet<string> | undefined): boolean =>
  b !== undefined && a.size === b.size && [...a].every((id) => b.has(id));

/**
 * Multi-selection over a list: plain SELECT replaces the selection with the clicked id,
 * SELECT+shift toggles the id in or out, EXTEND replaces it with the anchor→id range, CLEAR
 * empties it. A single `idle` state — the machine's value here is the typed event/context
 * contract, not state charts.
 */
export const multiSelectMachine = createMachine<MultiSelectSchema>({
  initialState: () => 'idle',

  context: ({ bindable, prop }) => ({
    selection: bindable<ReadonlySet<string>>(() => ({
      defaultValue: EMPTY_SELECTION,
      isEqual: setEquals,
      hash: (value) => [...value].sort().join('\n'),
      onChange: (value) => prop('onChange')?.({ selection: value }),
    })),
    anchor: bindable<string | undefined>(() => ({ defaultValue: undefined })),
  }),

  states: {
    idle: {
      on: {
        SELECT: [{ guard: 'isShift', actions: ['toggle'] }, { actions: ['replace'] }],
        EXTEND: { actions: ['extend'] },
        CLEAR: { actions: ['clear'] },
      },
    },
  },

  implementations: {
    guards: {
      isShift: ({ event }) => event.shift === true,
    },

    actions: {
      replace: ({ context, event }) => {
        context.set('selection', new Set([event.id]));
        context.set('anchor', event.id);
      },

      toggle: ({ context, event }) => {
        const next = new Set(context.get('selection'));
        if (next.has(event.id)) {
          next.delete(event.id);
        } else {
          next.add(event.id);
        }
        context.set('selection', next);
        context.set('anchor', event.id);
      },

      extend: ({ context, event, prop, action }) => {
        const items = prop('items') ?? [];
        const anchor = context.get('anchor');
        const from = anchor === undefined ? -1 : items.indexOf(anchor);
        const to = items.indexOf(event.id);
        if (from === -1 || to === -1) {
          // No anchored range to extend — degrade to the toggle gesture.
          action(['toggle']);
          return;
        }
        const [start, end] = from <= to ? [from, to] : [to, from];
        // The anchor is kept, so successive EXTENDs re-range from the same origin.
        context.set('selection', new Set(items.slice(start, end + 1)));
      },

      clear: ({ context }) => {
        context.set('selection', EMPTY_SELECTION);
        context.set('anchor', undefined);
      },
    },
  },
});

export type MultiSelectApi = {
  selection: ReadonlySet<string>;
  anchor: string | undefined;
  isSelected: (id: string) => boolean;
  select: (id: string, shift?: boolean) => void;
  extendTo: (id: string) => void;
  clear: () => void;
};

/**
 * The capability surface over a running service — plain values and event senders, no DOM props,
 * so the same connect serves React and the headless test.
 */
export const connect = (service: MultiSelectService): MultiSelectApi => {
  const selection = service.context.get('selection');
  return {
    selection,
    anchor: service.context.get('anchor'),
    isSelected: (id) => selection.has(id),
    select: (id, shift) => service.send({ type: 'SELECT', id, shift }),
    extendTo: (id) => service.send({ type: 'EXTEND', id }),
    clear: () => service.send({ type: 'CLEAR' }),
  };
};
