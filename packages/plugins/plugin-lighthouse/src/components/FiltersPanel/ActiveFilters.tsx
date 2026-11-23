//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';

import { type ResultsView, describeFilter, describeSort, isActive } from '#model';

import { LighthouseNamespace } from '../../namespace.ts';

export type ActiveFiltersProps = {
  view: ResultsView;
  /** Per filter id, how many results without a value it keeps (`applyView`'s `unknown`). */
  unknown: ReadonlyMap<string, number>;
  shown: number;
  total: number;
  onChange: (view: ResultsView) => void;
  /** Opens the panel (a chip's body). */
  onOpen: () => void;
};

const CHIP = 'inline-flex items-center rounded-sm border border-separator bg-base-surface text-sm';

/** The active filters and the person's sort as removable chips above the cards, with "N of M" and "Clear all". */
export const ActiveFilters = ({ view, unknown, shown, total, onChange, onOpen }: ActiveFiltersProps) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  const active = (view.filters ?? []).filter(isActive);
  const sorted = view.sort && view.sort.by !== 'score';
  if (!active.length && !sorted) {
    return null;
  }
  return (
    <Layout.Flex
      gap='xs'
      align='center'
      wrap
      role='list'
      aria-label={t('filters-chips.label')}
      classNames='px-2 py-1'
      data-testid='lighthouse.filters.chips'
    >
      <span className='text-sm text-fg-subtle tabular-nums' role='status' aria-live='polite'>
        {t('filters-count.label', { shown, total })}
      </span>
      {active.map((filter) => {
        const count = unknown.get(filter.id) ?? 0;
        const text = describeFilter(filter);
        const known = filter.includeMissing === false;
        return (
          <span key={filter.id} role='listitem' className={CHIP} data-testid='lighthouse.filters.chip'>
            <button
              type='button'
              className='px-2 py-0.5 text-start'
              onClick={onOpen}
              title={
                known
                  ? t('filters-chip-hidden.description', { filter: text })
                  : t('filters-chip-kept.description', { filter: text, count })
              }
            >
              {text}
              <span className='text-fg-subtle'>
                {known ? t('filters-chip-known.label') : count > 0 ? t('filters-chip-unknown.label', { count }) : ''}
              </span>
            </button>
            <Button.Root
              variant='ghost'
              iconOnly
              icon='ph--x--regular'
              classNames='h-6 min-h-0 px-1'
              label={t('filters-chip-remove.label', { filter: text })}
              onClick={() =>
                onChange({ ...view, filters: (view.filters ?? []).filter((other) => other.id !== filter.id) })
              }
              data-testid='lighthouse.filters.chip.remove'
            />
          </span>
        );
      })}
      {sorted && (
        <span role='listitem' className={CHIP} data-testid='lighthouse.filters.chip.sort'>
          <button type='button' className='inline-flex items-center gap-1 px-2 py-0.5' onClick={onOpen}>
            <Icon.Icon icon='ph--sort-ascending--regular' /> {describeSort(view.sort)}
          </button>
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--x--regular'
            classNames='h-6 min-h-0 px-1'
            label={t('filters-sort-reset.label')}
            onClick={() => {
              const { sort: _sort, ...rest } = view;
              onChange(rest);
            }}
          />
        </span>
      )}
      {active.length > 0 && (
        <Button.Root
          variant='ghost'
          classNames='text-sm text-accent-text'
          onClick={() => onChange({ ...view, filters: [] })}
          data-testid='lighthouse.filters.chips.clear'
        >
          {t('filters-clear.label')}
        </Button.Root>
      )}
    </Layout.Flex>
  );
};
