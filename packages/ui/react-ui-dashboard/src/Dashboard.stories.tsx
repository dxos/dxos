//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Unit, type UnitFormat } from '@dxos/util';

import { Dashboard } from './Dashboard';
import { type ActivityDatum } from './util';

const END_DATE = '2026-06-30';

// Deterministic PRNG so stories render identically across runs.
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const generateData = (endDate: string, days: number): ActivityDatum[] => {
  const random = mulberry32(1234);
  const [year, month, day] = endDate.split('-').map(Number);
  const end = new Date(year, month - 1, day);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end.getFullYear(), end.getMonth(), end.getDate() - index);
    const weekday = date.getDay();
    const busy = weekday === 0 || weekday === 6 ? 0.35 : 0.75;
    const value = random() < busy ? Math.floor(random() * 10) : 0;
    return { date, value };
  });
};

const stats: { label: string; value: number; unit?: UnitFormat }[] = [
  { label: 'Sessions', value: 73 },
  { label: 'Messages', value: 42_154 },
  { label: 'Total tokens', value: 36_200_000, unit: Unit.Million },
  { label: 'Active days', value: 34 },
  { label: 'Types', value: 24 },
  { label: 'Objects', value: 1_000 },
  { label: 'Relations', value: 230 },
  { label: 'Plugins', value: 12 },
];

const rangeToWeeks: Record<string, number> = {
  'all': 52,
  '30d': 5,
  '7d': 2,
};

const DefaultStory = () => {
  const [range, setRange] = useState('all');
  const data = useMemo(() => generateData(END_DATE, 365), []);

  return (
    <Dashboard.Root range={range} onRangeChange={setRange}>
      <Dashboard.Content classNames='w-[44rem]'>
        <Dashboard.Ranges classNames='justify-self-end'>
          <Dashboard.Range value='all'>All</Dashboard.Range>
          <Dashboard.Range value='30d'>30d</Dashboard.Range>
          <Dashboard.Range value='7d'>7d</Dashboard.Range>
        </Dashboard.Ranges>
        <Dashboard.Stats>
          {stats.map(({ label, value, unit }) => (
            <Dashboard.Stat key={label}>
              <Dashboard.StatLabel>{label}</Dashboard.StatLabel>
              <Dashboard.StatValue value={value} unit={unit} />
            </Dashboard.Stat>
          ))}
        </Dashboard.Stats>
        <Dashboard.Activity data={data} weeks={rangeToWeeks[range]} endDate={END_DATE} />
      </Dashboard.Content>
    </Dashboard.Root>
  );
};

const meta = {
  title: 'ui/react-ui-dashboard/Dashboard',
  component: Dashboard.Root,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Activity: Story = {
  render: () => (
    <Dashboard.Activity classNames='w-[44rem]' data={generateData(END_DATE, 365)} weeks={52} endDate={END_DATE} />
  ),
};

export const Stats: Story = {
  render: () => (
    <Dashboard.Stats classNames='w-[44rem]'>
      {stats.map(({ label, value, unit }) => (
        <Dashboard.Stat key={label}>
          <Dashboard.StatLabel>{label}</Dashboard.StatLabel>
          <Dashboard.StatValue value={value} unit={unit} />
        </Dashboard.Stat>
      ))}
    </Dashboard.Stats>
  ),
};

export const Ranges: Story = {
  render: () => (
    <Dashboard.Root defaultRange='30d'>
      <Dashboard.Ranges>
        <Dashboard.Range value='all'>All</Dashboard.Range>
        <Dashboard.Range value='30d'>30d</Dashboard.Range>
        <Dashboard.Range value='7d'>7d</Dashboard.Range>
      </Dashboard.Ranges>
    </Dashboard.Root>
  ),
};
