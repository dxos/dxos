//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import * as Button from '@dxos/react-ui/Button';

import { createLineSeparator, createMenuAction, createMenuItemGroup } from '../util.ts';
import { ActionMenu } from './ActionMenu.tsx';

/** One choice of a {@link SortMenu} or {@link GroupMenu}, labelled by the host so each list keeps its own wording. */
export type ViewOption<T extends string> = {
  id: T;
  label: string;
  icon: string;
};

export type SortDirection = 'asc' | 'desc';

export type SortValue<T extends string> = {
  field: T;
  direction: SortDirection;
};

export type SortMenuProps<T extends string> = {
  fields: readonly ViewOption<T>[];
  value: SortValue<T>;
  onChange: (value: SortValue<T>) => void;
  /** Trigger label while the list is in its own order, and the menu's heading. */
  label: string;
  directionLabels: Record<SortDirection, string>;
  /** A field that is the list's own order (e.g. a hand-arranged one), so it has no direction to pick. */
  unsorted?: T;
  /** Prefix of the trigger's and items' test ids (`<testId>.<field>`, `<testId>.<direction>`). */
  testId?: string;
};

/**
 * The order-by field and its direction, as one menu beside a list's filter. The value is the host's to
 * persist — typically in a `ViewState` aspect beside the filter query.
 */
export const SortMenu = <T extends string>({
  fields,
  value,
  onChange,
  label,
  directionLabels,
  unsorted,
  testId = 'sort',
}: SortMenuProps<T>) => {
  const sorted = value.field !== unsorted;
  const current = fields.find((field) => field.id === value.field);

  const group = useMemo(
    () =>
      createMenuItemGroup(testId, {
        label,
        icon: 'ph--sort-ascending--regular',
        variant: 'dropdownMenu',
        selectCardinality: 'single',
        value: value.field,
      }),
    [testId, label, value.field],
  );

  const actions = useCallback(
    () => [
      ...fields.map((field) =>
        createMenuAction(`sort-${field.id}`, () => onChange({ ...value, field: field.id }), {
          label: field.label,
          icon: field.icon,
          checked: value.field === field.id,
          testId: `${testId}.${field.id}`,
        }),
      ),
      createLineSeparator(`${testId}Separator`).nodes[0],
      ...(['asc', 'desc'] as const).map((direction) =>
        createMenuAction(`sort-${direction}`, () => onChange({ ...value, direction }), {
          label: directionLabels[direction],
          icon: direction === 'asc' ? 'ph--sort-ascending--regular' : 'ph--sort-descending--regular',
          checked: sorted && value.direction === direction,
          disabled: !sorted,
          testId: `${testId}.${direction}`,
        }),
      ),
    ],
    [fields, value, sorted, onChange, directionLabels, testId],
  );

  return (
    <ActionMenu deferUntilOpen group={group} actions={actions}>
      <Button.Root
        // The trigger names the order while it is not the list's own, so a reader can tell why rows moved.
        icon={
          !sorted
            ? 'ph--arrows-down-up--regular'
            : value.direction === 'asc'
              ? 'ph--sort-ascending--regular'
              : 'ph--sort-descending--regular'
        }
        iconOnly={!sorted}
        label={sorted && current ? current.label : label}
        data-testid={testId}
      />
    </ActionMenu>
  );
};

SortMenu.displayName = 'SortMenu';

export type GroupMenuProps<T extends string> = {
  fields: readonly ViewOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Trigger label while the list is ungrouped, and the menu's heading. */
  label: string;
  /** The field that means one ungrouped list. */
  none?: T;
  /** Prefix of the trigger's and items' test ids (`<testId>.<field>`). */
  testId?: string;
};

/** What a list is grouped by, as a single-select menu beside its sort. */
export const GroupMenu = <T extends string>({
  fields,
  value,
  onChange,
  label,
  none,
  testId = 'group',
}: GroupMenuProps<T>) => {
  const current = value !== none ? fields.find((field) => field.id === value) : undefined;

  const group = useMemo(
    () =>
      createMenuItemGroup(testId, {
        label,
        icon: 'ph--rows--regular',
        variant: 'dropdownMenu',
        selectCardinality: 'single',
        value,
      }),
    [testId, label, value],
  );

  const actions = useCallback(
    () =>
      fields.map((field) =>
        createMenuAction(`group-${field.id}`, () => onChange(field.id), {
          label: field.label,
          icon: field.icon,
          checked: value === field.id,
          testId: `${testId}.${field.id}`,
        }),
      ),
    [fields, value, onChange, testId],
  );

  return (
    <ActionMenu deferUntilOpen group={group} actions={actions}>
      <Button.Root
        icon={current ? current.icon : 'ph--rows--regular'}
        iconOnly={!current}
        label={current ? current.label : label}
        data-testid={testId}
      />
    </ActionMenu>
  );
};

GroupMenu.displayName = 'GroupMenu';
