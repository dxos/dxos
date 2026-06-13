//
// Copyright 2026 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { type MouseEvent, useCallback, useId } from 'react';

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
 * values — `useControllableState` would otherwise flip to uncontrolled on clear.
 */
export const useListDisclosure: {
  <M extends ListDisclosureMode>(opts: UseListDisclosureOptions<M>): UseListDisclosureReturn;
} = ({ mode, value, defaultValue, onValueChange }) => {
  const idPrefix = useId();

  // `useControllableState` accepts `T | undefined`; the controlled path holds whatever the
  // caller passes in. We branch on `mode` once when toggling so the public API stays clean.
  const [resolvedValue, setResolvedValue] = useControllableState<SingleValue | MultiValue>({
    prop: value,
    defaultProp: defaultValue,
    onChange: (next) => {
      // Tightening the callback type for callers is safe: `next` always matches the
      // declared mode because we only write values of that shape ourselves.
      onValueChange?.(next as ValueFor<typeof mode>);
    },
  });

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
      if (mode === 'multi') {
        const current = isMulti(resolvedValue) ? resolvedValue : new Set<string>();
        const next = new Set(current);
        if (expanded) {
          next.add(id);
        } else {
          next.delete(id);
        }
        setResolvedValue(next);
      } else {
        setResolvedValue(expanded ? id : undefined);
      }
    },
    [mode, resolvedValue, setResolvedValue],
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
