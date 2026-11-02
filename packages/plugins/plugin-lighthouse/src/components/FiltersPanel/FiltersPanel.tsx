//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useRef, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Select from '@dxos/react-ui/Select';

import { type Entity } from '#client';
import { type Facet, type ResultsView, type ViewContext, type ViewFilter, facetCounts, isActive } from '#model';

import { LighthouseNamespace } from '../../namespace.ts';
import { FacetBox } from './FacetControls.tsx';
import { sortKey, sortOptions } from './sort-options.ts';

// Ported from lighthouse `web/src/components/FiltersPanel.tsx` (1a137e8; SPEC "Filters and sort", D-156, D-157).

export type FiltersPanelProps = {
  facets: ReadonlyArray<Facet>;
  /** Every result: the counts and "N of M" are over all of them. */
  items: ReadonlyArray<Entity>;
  view: ResultsView;
  ctx: ViewContext;
  /** How many pass the view. */
  shown: number;
  hasAreas: boolean;
  onChange: (view: ResultsView) => void;
  onClose: () => void;
};

/**
 * The person's own filters and sort for the results: controls derived from the results' properties (ranges with a
 * histogram, checkbox lists with live counts, toggles, "in the last N days") and a sort that defaults to the rating
 * model's score; the primary facets first, the rest under "More filters". Filters cut the list and the map's pins;
 * the score stays the model's.
 */
export const FiltersPanel = ({ facets, items, view, ctx, shown, hasAreas, onChange, onClose }: FiltersPanelProps) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  const [more, setMore] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const filters = view.filters ?? [];
  const byId = new Map(filters.map((filter) => [filter.id, filter]));
  const setFilter = (id: string) => (next: ViewFilter | undefined) => {
    const rest = filters.filter((filter) => filter.id !== id);
    onChange({ ...view, filters: next ? [...rest, next] : rest });
  };
  const counts = useMemo(
    () => new Map(facets.map((facet) => [facet.id, facetCounts(items, view, facet, ctx)])),
    [facets, items, view, ctx],
  );
  const options = useMemo(() => sortOptions(facets, hasAreas), [facets, hasAreas]);
  const primary = facets.filter((facet) => {
    const filter = byId.get(facet.id);
    return facet.primary || (filter !== undefined && isActive(filter));
  });
  const rest = facets.filter((facet) => !primary.includes(facet));
  const active = filters.filter(isActive).length;
  const current = sortKey(view.sort);
  const selected = options.some((option) => option.key === current) ? current : 'score';
  const items_ = options.map(({ key, label }) => ({ value: key, label }));

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label={t('filters-panel.label')}
      className='flex flex-col gap-2 p-2 border-b border-separator outline-none'
      data-testid='lighthouse.filters'
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <Layout.Flex gap='sm' align='center' wrap>
        <span className='font-medium'>{t('filters.label')}</span>
        <span
          className='text-sm text-fg-subtle tabular-nums'
          role='status'
          aria-live='polite'
          data-testid='lighthouse.filters.count'
        >
          {t('filters-count.label', { shown, total: items.length })}
        </span>
        <span className='grow' />
        <Layout.Flex gap='xs' align='center'>
          <span className='text-sm text-fg-subtle'>{t('filters-sort.label')}</span>
          <Select.Root
            items={items_}
            value={[selected]}
            onValueChange={({ value: [key] }) => {
              const sort = options.find((option) => option.key === key)?.sort;
              const { sort: _old, ...withoutSort } = view;
              onChange(sort && sort.by !== 'score' ? { ...withoutSort, sort } : withoutSort);
            }}
          >
            <Select.Trigger aria-label={t('filters-sort.label')} data-testid='lighthouse.filters.sort' />
            <Select.Content>
              {items_.map((item) => (
                <Select.Item key={item.value} item={item} data-testid='lighthouse.filters.sort.option' />
              ))}
            </Select.Content>
          </Select.Root>
        </Layout.Flex>
        {active > 0 && (
          <Button.Root
            variant='ghost'
            icon='ph--eraser--regular'
            label={t('filters-clear.label')}
            onClick={() => onChange({ ...view, filters: [] })}
            data-testid='lighthouse.filters.clear'
          />
        )}
        <Button.Root
          variant='ghost'
          icon='ph--x--regular'
          iconOnly
          label={t('filters-close.label')}
          onClick={onClose}
          data-testid='lighthouse.filters.close'
        />
      </Layout.Flex>
      {facets.length === 0 ? (
        <p className='text-sm text-fg-subtle'>{t('filters-empty.message')}</p>
      ) : (
        <div className='grid gap-2 grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]'>
          {[...primary, ...(more ? rest : [])].map((facet) => {
            const facetCount = counts.get(facet.id);
            return facetCount ? (
              <FacetBox
                key={facet.id}
                facet={facet}
                filter={byId.get(facet.id)}
                counts={facetCount}
                set={setFilter(facet.id)}
              />
            ) : null;
          })}
        </div>
      )}
      {rest.length > 0 && (
        <div>
          <Button.Root
            variant='ghost'
            classNames='text-sm text-accent-text'
            aria-expanded={more}
            onClick={() => setMore(!more)}
            data-testid='lighthouse.filters.more'
          >
            {more ? t('filters-fewer.label') : t('filters-more.label', { count: rest.length })}
          </Button.Root>
        </div>
      )}
      <p className='text-xs text-fg-subtle'>{t('filters-foot.message')}</p>
    </section>
  );
};
