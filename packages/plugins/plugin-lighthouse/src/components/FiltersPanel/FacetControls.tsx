//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Select from '@dxos/react-ui/Select';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import { mx } from '@dxos/ui-theme';

import { type Facet, type FacetCounts, type ViewFilter, filterFor, isActive } from '#model';

import { LighthouseNamespace } from '../../namespace.ts';
import { formatBound, stepOf } from './sort-options.ts';

type RangeFilter = Extract<ViewFilter, { kind: 'range' }>;
type ValuesFilter = Extract<ViewFilter, { kind: 'values' }>;
type DateFilter = Extract<ViewFilter, { kind: 'date' }>;

/** Sets a facet's filter; `undefined` removes it. */
export type SetFilter = (next: ViewFilter | undefined) => void;

const DAYS = [1, 3, 7, 14, 30, 90];

/** Checkbox lists show this many values before "Show all". */
const SHOWN_VALUES = 8;

/**
 * The dark theme's input surface is close to the panel's, so the slider's empty track gets the separator colour to
 * stay visible; the slider has no intrinsic width, so it always sits in a sized box.
 */
const SLIDER_CLASSES = '[&_.dx-slider-track]:bg-separator';

const Histogram = ({
  bins,
  facet,
  lo,
  hi,
}: {
  bins: ReadonlyArray<number>;
  facet: Facet;
  lo?: number;
  hi?: number;
}) => {
  const peak = Math.max(1, ...bins);
  const min = facet.min ?? 0;
  const width = ((facet.max ?? min) - min) / bins.length || 1;
  return (
    <svg
      className='block w-full h-6'
      viewBox={`0 0 ${bins.length * 4} 24`}
      preserveAspectRatio='none'
      aria-hidden='true'
      data-testid='lighthouse.filter.histogram'
    >
      {bins.map((count, index) => {
        const start = min + index * width;
        const inside = (lo === undefined || start + width > lo) && (hi === undefined || start <= hi);
        const height = count ? Math.max(1.5, (count / peak) * 24) : 0;
        return (
          <rect
            key={index}
            x={index * 4 + 0.4}
            y={24 - height}
            width={3.2}
            height={height}
            style={{ fill: inside ? 'var(--color-accent-bg)' : 'var(--color-separator)' }}
          />
        );
      })}
    </svg>
  );
};

const parseBound = (text: string) => (text.trim() === '' || Number.isNaN(Number(text)) ? undefined : Number(text));

const RangeControl = ({
  facet,
  filter,
  counts,
  set,
}: {
  facet: Facet;
  filter?: RangeFilter;
  counts: FacetCounts;
  set: SetFilter;
}) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  const min = facet.min ?? 0;
  const max = facet.max ?? 0;
  const step = stepOf(facet);
  const lo = filter?.min;
  const hi = filter?.max;
  const base = filter ?? (filterFor(facet) as RangeFilter);
  const write = (nextLo: number | undefined, nextHi: number | undefined) => {
    // A thumb at the end of the track is an open bound.
    const low = nextLo === undefined || nextLo <= min ? undefined : nextLo;
    const high = nextHi === undefined || nextHi >= max ? undefined : nextHi;
    const { min: _min, max: _max, ...rest } = base;
    set({ ...rest, ...(low !== undefined ? { min: low } : {}), ...(high !== undefined ? { max: high } : {}) });
  };
  return (
    <Layout.Flex column gap='xs'>
      {counts.histogram && <Histogram bins={counts.histogram} facet={facet} lo={lo} hi={hi} />}
      <div className='w-full min-w-32'>
        <Input.Slider
          classNames={SLIDER_CLASSES}
          min={min}
          max={max}
          step={step}
          value={[lo ?? min, hi ?? max]}
          thumbLabels={[
            t('filters-lowest.label', { label: facet.label }),
            t('filters-highest.label', { label: facet.label }),
          ]}
          onValueChange={([nextLo, nextHi]) => write(nextLo, nextHi)}
          data-testid={`lighthouse.filter.${facet.id}.slider`}
        />
      </div>
      <Layout.Flex gap='xs' align='center'>
        <Input.Root
          type='number'
          inputMode='decimal'
          classNames='min-w-0 tabular-nums'
          placeholder={formatBound(min)}
          value={lo ?? ''}
          step={step}
          onChange={(event) => write(parseBound(event.target.value), hi)}
          aria-label={t('filters-at-least.label', { label: facet.label })}
          data-testid={`lighthouse.filter.${facet.id}.min`}
        />
        <span aria-hidden='true' className='text-fg-subtle'>
          -
        </span>
        <Input.Root
          type='number'
          inputMode='decimal'
          classNames='min-w-0 tabular-nums'
          placeholder={formatBound(max)}
          value={hi ?? ''}
          step={step}
          onChange={(event) => write(lo, parseBound(event.target.value))}
          aria-label={t('filters-at-most.label', { label: facet.label })}
          data-testid={`lighthouse.filter.${facet.id}.max`}
        />
      </Layout.Flex>
    </Layout.Flex>
  );
};

const ValuesControl = ({
  facet,
  filter,
  counts,
  set,
}: {
  facet: Facet;
  filter?: ValuesFilter;
  counts: FacetCounts;
  set: SetFilter;
}) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  const [query, setQuery] = useState('');
  const [all, setAll] = useState(false);
  const chosen = new Set(filter?.values ?? []);
  const options = facet.options ?? [];
  const needle = query.trim().toLowerCase();
  const matching = needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;
  // Chosen values stay visible however the list is cut.
  const visible =
    all || needle
      ? matching
      : [
          ...matching.slice(0, SHOWN_VALUES),
          ...matching.slice(SHOWN_VALUES).filter((option) => chosen.has(option.value)),
        ];
  const base = filter ?? (filterFor(facet) as ValuesFilter);
  const toggle = (value: string, on: boolean) => {
    const values = on ? [...(filter?.values ?? []), value] : (filter?.values ?? []).filter((v) => v !== value);
    set({ ...base, values });
  };
  return (
    <Layout.Flex column gap='xs'>
      {options.length > SHOWN_VALUES && (
        <Input.Root
          type='search'
          placeholder={t('filters-search.placeholder', { count: options.length })}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={t('filters-search.label', { label: facet.label })}
          data-testid={`lighthouse.filter.${facet.id}.search`}
        />
      )}
      <ul className='flex flex-col max-h-60 overflow-y-auto'>
        {visible.map((option) => {
          const count = counts.options?.get(option.value) ?? 0;
          return (
            <li
              key={option.value}
              className={mx(
                'flex items-center gap-2 text-sm',
                count === 0 && !chosen.has(option.value) && 'opacity-50',
              )}
            >
              <Input.Checkbox
                classNames='grow min-w-0'
                label={<span className='truncate'>{option.label}</span>}
                checked={chosen.has(option.value)}
                onCheckedChange={({ checked }) => toggle(option.value, checked === true)}
                data-testid={`lighthouse.filter.${facet.id}.option`}
              />
              <span className='text-xs text-fg-subtle tabular-nums'>{count}</span>
            </li>
          );
        })}
      </ul>
      <Layout.Flex gap='sm' align='center' wrap>
        {!needle && matching.length > SHOWN_VALUES && (
          <Button.Root
            variant='ghost'
            classNames='text-xs text-accent-text'
            onClick={() => setAll(!all)}
            data-testid={`lighthouse.filter.${facet.id}.all`}
          >
            {all ? t('filters-show-fewer.label') : t('filters-show-all.label', { count: matching.length })}
          </Button.Root>
        )}
        {facet.multi && chosen.size > 1 && (
          <ToggleGroup.Root
            type='single'
            value={filter?.all ? 'all' : 'any'}
            onValueChange={(value) => set({ ...base, ...(value === 'all' ? { all: true } : { all: undefined }) })}
            aria-label={t('filters-match.label')}
          >
            <ToggleGroup.Item value='any' data-testid={`lighthouse.filter.${facet.id}.any`}>
              {t('filters-any.label')}
            </ToggleGroup.Item>
            <ToggleGroup.Item value='all' data-testid={`lighthouse.filter.${facet.id}.every`}>
              {t('filters-all.label')}
            </ToggleGroup.Item>
          </ToggleGroup.Root>
        )}
      </Layout.Flex>
    </Layout.Flex>
  );
};

const FlagControl = ({
  facet,
  filter,
  counts,
  set,
}: {
  facet: Facet;
  filter?: ViewFilter;
  counts: FacetCounts;
  set: SetFilter;
}) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  return (
    <Layout.Flex gap='sm' align='center' classNames='text-sm'>
      <Input.Switch
        aria-label={`${facet.label}: ${t('filters-only.label')}`}
        checked={!!filter}
        onCheckedChange={({ checked }) => set(checked ? (filter ?? filterFor(facet)) : undefined)}
        data-testid={`lighthouse.filter.${facet.id}.toggle`}
      />
      <span className='grow'>{t('filters-only.label')}</span>
      <span className='text-xs text-fg-subtle tabular-nums'>{counts.yes ?? 0}</span>
    </Layout.Flex>
  );
};

const ANY_TIME = 'any';

const DateControl = ({ facet, filter, set }: { facet: Facet; filter?: DateFilter; set: SetFilter }) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  const items: Select.Option[] = [
    { value: ANY_TIME, label: t('filters-any-time.label') },
    ...DAYS.map((days) => ({
      value: String(days),
      label: days === 1 ? t('filters-last-day.label') : t('filters-last-days.label', { count: days }),
    })),
  ];
  return (
    <Select.Root
      items={items}
      value={[filter?.days ? String(filter.days) : ANY_TIME]}
      onValueChange={({ value: [value] }) =>
        set(
          value && value !== ANY_TIME
            ? {
                ...(filterFor(facet) as DateFilter),
                ...(filter?.includeMissing === false ? { includeMissing: false } : {}),
                days: Number(value),
              }
            : undefined,
        )
      }
    >
      <Select.Trigger
        aria-label={t('filters-days.label', { label: facet.label })}
        data-testid={`lighthouse.filter.${facet.id}.days`}
      />
      <Select.Content>
        {items.map((item) => (
          <Select.Item key={item.value} item={item} />
        ))}
      </Select.Content>
    </Select.Root>
  );
};

/** One facet: its name (the CURIE on hover), its control, a clear button, and "Include N without this". */
export const FacetBox = ({
  facet,
  filter,
  counts,
  set,
}: {
  facet: Facet;
  filter?: ViewFilter;
  counts: FacetCounts;
  set: SetFilter;
}) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  const active = !!filter && isActive(filter);
  const keepUnknown = filter?.includeMissing !== false;
  return (
    <fieldset
      className={mx(
        'flex flex-col gap-1 min-w-0 p-2 rounded-sm border',
        active ? 'border-accent-surface bg-base-surface' : 'border-separator',
      )}
      data-testid={`lighthouse.filter.${facet.id}`}
      data-active={active || undefined}
    >
      <Layout.Flex gap='xs' align='center'>
        <legend className='contents'>
          <span className='font-medium text-sm truncate grow min-w-0' title={facet.curie}>
            {facet.label}
          </span>
        </legend>
        {facet.inModel && (
          <span
            className='text-[0.625rem] uppercase tracking-wide text-accent-text'
            title={t('filters-model.description')}
          >
            {t('filters-model.label')}
          </span>
        )}
        {active && (
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--x--regular'
            classNames='h-6 min-h-0 px-1'
            label={t('filters-clear-one.label', { label: facet.label })}
            onClick={() => set(undefined)}
            data-testid={`lighthouse.filter.${facet.id}.clear`}
          />
        )}
      </Layout.Flex>
      {facet.kind === 'range' && (
        <RangeControl facet={facet} filter={filter as RangeFilter | undefined} counts={counts} set={set} />
      )}
      {facet.kind === 'values' && (
        <ValuesControl facet={facet} filter={filter as ValuesFilter | undefined} counts={counts} set={set} />
      )}
      {facet.kind === 'flag' && <FlagControl facet={facet} filter={filter} counts={counts} set={set} />}
      {facet.kind === 'date' && <DateControl facet={facet} filter={filter as DateFilter | undefined} set={set} />}
      {active && filter && counts.unknown > 0 && (
        <Input.Checkbox
          classNames='text-xs text-fg-subtle'
          label={t('filters-unknown.label', { count: counts.unknown })}
          checked={keepUnknown}
          onCheckedChange={({ checked }) =>
            set({ ...filter, ...(checked === true ? { includeMissing: undefined } : { includeMissing: false }) })
          }
          data-testid={`lighthouse.filter.${facet.id}.unknown`}
        />
      )}
    </fieldset>
  );
};
