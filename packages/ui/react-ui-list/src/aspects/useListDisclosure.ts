//
// Copyright 2026 DXOS.org
//

import { type MouseEvent, useCallback, useEffect, useId, useRef, useState } from 'react';

export type ListDisclosureMode = 'single' | 'multi';

type SingleValue = string | undefined;
type MultiValue = ReadonlySet<string>;

type ValueFor<M extends ListDisclosureMode> = M extends 'single' ? SingleValue : MultiValue;

export type UseListDisclosureOptions<M extends ListDisclosureMode = ListDisclosureMode> = {
  mode: M;
  /** Controlled value: a single id (single mode) or a set of ids (multi mode). */
  value?: ValueFor<M>;
  defaultValue?: ValueFor<M>;
  /** Called whenever the disclosure value changes. */
  onValueChange?: (next: ValueFor<M>) => void;
};

export type DisclosureItemBinding = {
  expanded: boolean;
  toggle: () => void;
  /** Stable id on the disclosure trigger; the controlled panel references it via aria-labelledby. */
  triggerId: string;
  /** Stable id on the controlled panel; the trigger references it via aria-controls. */
  panelId: string;
  /** Spread onto the trigger element (button, title row, …). */
  triggerProps: {
    id: string;
    'aria-expanded': boolean;
    'aria-controls': string;
    onClick: (event: MouseEvent) => void;
  };
  /** Spread onto the disclosed panel; carries role=region for SR navigation. */
  panelProps: {
    id: string;
    role: 'region';
    'aria-labelledby': string;
  };
};

export type UseListDisclosureReturn = {
  /** Return the disclosure binding for a single item by id. */
  bind: (id: string) => DisclosureItemBinding;
};

const isMulti = (value: SingleValue | MultiValue): value is MultiValue => value instanceof Set;

/**
 * Disclosure (open/close) aspect for list items. Owns single- or multi-expand state and
 * generates the trigger/panel ids needed for `aria-controls` / `aria-labelledby`. Pairs
 * with `useListGrid`'s expand-caret slot.
 *
 * `single` mode tracks one expanded id; expanding another collapses the previous (matches
 * the existing `OrderedList` behaviour).
 *
 * `multi` mode tracks a `Set<string>` of expanded ids; intended for `Tree` and other
 * multi-branch disclosure surfaces.
 *
 * Controlled-ness keys on `onValueChange` rather than on the value's presence so that
 * `undefined` (single mode) and the empty set (multi mode) remain valid "nothing expanded"
 * values. Radix's `useControllableState` (1.1.0) flips to uncontrolled when a controlled
 * value clears to `undefined`, then re-reads the stale internal state and fails to collapse —
 * a hand-rolled controller is the only correct option here.
 */
export const useListDisclosure: {
  <M extends ListDisclosureMode>(opts: UseListDisclosureOptions<M>): UseListDisclosureReturn;
} = ({ mode, value, defaultValue, onValueChange }) => {
  const idPrefix = useId();

  // Latches once the consumer has ever passed a non-undefined `value`, so subsequent renders
  // with `value === undefined` are treated as "controlled cleared" rather than "switched to
  // uncontrolled" — a `string | undefined` parent state should be able to clear to undefined
  // without the row falling back to stale internal state.
  const wasControlledRef = useRef(false);
  if (value !== undefined) {
    wasControlledRef.current = true;
  }
  const isControlled = wasControlledRef.current;

  const [internalValue, setInternalValue] = useState<SingleValue | MultiValue>(() => defaultValue);

  // Mirror the controlled prop into internal state so going uncontrolled in a later render
  // doesn't surface a stale internal value (and so consumers can read `internalValue`
  // uniformly regardless of mode).
  useEffect(() => {
    if (isControlled) {
      setInternalValue(value);
    }
  }, [isControlled, value]);

  const resolvedValue = isControlled ? value : internalValue;

  const isExpanded = useCallback(
    (id: string) => {
      if (mode === 'multi') {
        return isMulti(resolvedValue) && resolvedValue.has(id);
      }
      return resolvedValue === id;
    },
    [mode, resolvedValue],
  );

  const setExpanded = useCallback(
    (id: string, expanded: boolean) => {
      const computeNext = (): SingleValue | MultiValue => {
        if (mode === 'multi') {
          const current = isMulti(resolvedValue) ? resolvedValue : new Set<string>();
          const next = new Set(current);
          if (expanded) {
            next.add(id);
          } else {
            next.delete(id);
          }
          return next;
        }
        return expanded ? id : undefined;
      };
      const next = computeNext();
      if (!isControlled) {
        setInternalValue(next);
      }
      onValueChange?.(next as ValueFor<typeof mode>);
    },
    [mode, resolvedValue, isControlled, onValueChange],
  );

  const bind = useCallback(
    (id: string): DisclosureItemBinding => {
      const expanded = isExpanded(id);
      const triggerId = `${idPrefix}-${id}-trigger`;
      const panelId = `${idPrefix}-${id}-panel`;
      return {
        expanded,
        toggle: () => setExpanded(id, !expanded),
        triggerId,
        panelId,
        triggerProps: {
          id: triggerId,
          'aria-expanded': expanded,
          'aria-controls': panelId,
          onClick: () => setExpanded(id, !expanded),
        },
        panelProps: {
          id: panelId,
          role: 'region',
          'aria-labelledby': triggerId,
        },
      };
    },
    [idPrefix, isExpanded, setExpanded],
  );

  return { bind };
};
