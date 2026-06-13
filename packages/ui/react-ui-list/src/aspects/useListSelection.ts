//
// Copyright 2026 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { type FocusEvent, type MouseEvent, useCallback } from 'react';

export type ListSelectionMode = 'single' | 'multi';

type SingleValue = string | undefined;
type MultiValue = ReadonlySet<string>;

type ValueFor<M extends ListSelectionMode> = M extends 'single' ? SingleValue : MultiValue;

export type UseListSelectionOptions<M extends ListSelectionMode = ListSelectionMode> = {
  mode: M;
  /** Controlled selected id (single mode) or set of ids (multi mode). */
  value?: ValueFor<M>;
  defaultValue?: ValueFor<M>;
  onValueChange?: (next: ValueFor<M>) => void;
  /**
   * Selection follows focus. Defaults to `true` for single-select (matches the WAI-ARIA
   * listbox pattern) and `false` for multi-select (focus and toggle are separate gestures).
   */
  followsFocus?: boolean;
};

export type SelectionItemBinding = {
  selected: boolean;
  toggle: () => void;
  /** Spread onto the row element to bind click + focus + ARIA. */
  rowProps: {
    'aria-selected': boolean;
    onClick: (event: MouseEvent) => void;
    onFocus?: (event: FocusEvent) => void;
  };
};

export type UseListSelectionReturn = {
  bind: (id: string, opts?: { disabled?: boolean }) => SelectionItemBinding;
};

const isMulti = (value: SingleValue | MultiValue): value is MultiValue => value instanceof Set;

/**
 * Selection aspect for list-shaped surfaces. Owns single- or multi-select state with
 * controllable value semantics; emits `aria-selected` + click/focus handlers per row.
 *
 * `single` mode: at most one selected id, selection follows focus by default. Matches the
 * existing `RowList` behaviour and the WAI-ARIA listbox single-select pattern.
 *
 * `multi` mode: tracks a `Set<string>`. Selection does NOT follow focus by default — multi
 * select usually pairs with an explicit toggle affordance (checkbox or keyboard Space) rather
 * than implicit focus-tracking.
 */
export const useListSelection: {
  <M extends ListSelectionMode>(opts: UseListSelectionOptions<M>): UseListSelectionReturn;
} = ({ mode, value, defaultValue, onValueChange, followsFocus }) => {
  const [resolvedValue, setResolvedValue] = useControllableState<SingleValue | MultiValue>({
    prop: value,
    defaultProp: defaultValue,
    onChange: (next) => onValueChange?.(next as ValueFor<typeof mode>),
  });

  const isSelected = useCallback(
    (id: string) => {
      if (mode === 'multi') {
        return isMulti(resolvedValue) && resolvedValue.has(id);
      }
      return resolvedValue === id;
    },
    [mode, resolvedValue],
  );

  const setSelected = useCallback(
    (id: string, selected: boolean) => {
      if (mode === 'multi') {
        const current = isMulti(resolvedValue) ? resolvedValue : new Set<string>();
        const next = new Set(current);
        if (selected) {
          next.add(id);
        } else {
          next.delete(id);
        }
        setResolvedValue(next);
      } else {
        setResolvedValue(selected ? id : undefined);
      }
    },
    [mode, resolvedValue, setResolvedValue],
  );

  const followFocusDefault = mode === 'single';
  const trackFocus = followsFocus ?? followFocusDefault;

  const bind = useCallback(
    (id: string, { disabled }: { disabled?: boolean } = {}): SelectionItemBinding => {
      const selected = isSelected(id);
      return {
        selected,
        toggle: () => {
          if (!disabled) {
            setSelected(id, mode === 'multi' ? !selected : true);
          }
        },
        rowProps: {
          'aria-selected': selected,
          onClick: () => {
            if (disabled) {
              return;
            }
            setSelected(id, mode === 'multi' ? !selected : true);
          },
          ...(trackFocus && {
            onFocus: () => {
              if (!disabled && !selected) {
                setSelected(id, true);
              }
            },
          }),
        },
      };
    },
    [isSelected, mode, setSelected, trackFocus],
  );

  return { bind };
};
