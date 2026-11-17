//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Menu from '@dxos/react-ui/Menu';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';

import { translationKey } from '#translations';

import { type EntityTypeCount } from '../../model/index.ts';

/** Types shown as buttons before the rest fold into the overflow menu. */
const DEFAULT_MAX_VISIBLE = 4;

export type TypeFilterProps = Util.ThemedClassName<{
  /** The classes present, most common first (see `entityTypeCounts`). */
  types: readonly EntityTypeCount[];
  /** The chosen class; undefined shows every class. */
  value?: string;
  /** Called with the class chosen, or undefined when the chosen one is chosen again. */
  onValueChange: (type: string | undefined) => void;
  /** How many classes get a button of their own. */
  maxVisible?: number;
}>;

/**
 * One toggle per entity class with its count, most common first; choosing the chosen class again clears the filter.
 * Classes past `maxVisible` fold into a menu whose trigger names the chosen class when it is one of them.
 */
export const TypeFilter = ({
  classNames,
  types,
  value,
  onValueChange,
  maxVisible = DEFAULT_MAX_VISIBLE,
}: TypeFilterProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  // One more button than `maxVisible` would cost no more room than the menu trigger, so a single extra type stays out.
  const visibleCount = types.length > maxVisible + 1 ? maxVisible : types.length;
  const visible = types.slice(0, visibleCount);
  const overflow = types.slice(visibleCount);
  const chosenOverflow = overflow.find(({ type }) => type === value);
  const label = ({ type, count }: EntityTypeCount) => t('entity-type-filter.item', { type, count });

  return (
    <Toolbar.Root classNames={classNames} data-testid='entity-type-filter'>
      <Toolbar.ToggleGroup
        type='single'
        // A class folded into the menu is chosen there, so no button shows it pressed.
        value={chosenOverflow ? '' : (value ?? '')}
        onValueChange={(next) => onValueChange(next || undefined)}
        aria-label={t('entity-type-filter.label')}
      >
        {visible.map((entry) => (
          <ToggleGroup.Item key={entry.type} value={entry.type} data-testid='entity-type-filter.item'>
            {label(entry)}
          </ToggleGroup.Item>
        ))}
      </Toolbar.ToggleGroup>
      {overflow.length > 0 && (
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button.Root
              variant={chosenOverflow ? 'primary' : 'ghost'}
              icon='ph--caret-down--regular'
              data-testid='entity-type-filter.more'
            >
              {chosenOverflow ? label(chosenOverflow) : t('entity-type-filter.more', { count: overflow.length })}
            </Button.Root>
          </Menu.Trigger>
          <Menu.Content>
            {overflow.map((entry) => (
              <Menu.CheckboxItem
                key={entry.type}
                item={{ value: entry.type, label: label(entry) }}
                checked={entry.type === value}
                onCheckedChange={(checked) => onValueChange(checked ? entry.type : undefined)}
                data-testid='entity-type-filter.menu-item'
              />
            ))}
          </Menu.Content>
        </Menu.Root>
      )}
    </Toolbar.Root>
  );
};
