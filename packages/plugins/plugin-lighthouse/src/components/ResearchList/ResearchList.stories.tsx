//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { type ResearchRow } from '../../model/research-list.ts';
import { ResearchList } from './ResearchList.tsx';

const rows: ResearchRow[] = [
  {
    id: '01K8Q3',
    name: 'Mizuno top',
    goal: 'Find this top in stores where I can pick it up in central Bangkok, with price and sizes',
    state: 'running',
    pages: 50,
    usd: 0.086,
    startedAt: '2026-10-29T06:40:00Z',
  },
  {
    id: '01K8Q2',
    name: 'Warsaw apartments',
    goal: '2-room apartments for rent in central Warsaw under 6000 PLN total with a balcony, near metro',
    state: 'reported',
    pages: 17,
    usd: 0.069,
    startedAt: '2026-10-28T11:00:00Z',
  },
  { id: '01K8Q1', name: 'BlueYard', goal: 'Everything about BlueYard', state: 'failed', pages: 4, usd: 0.012 },
  { id: '01K8Q0', name: 'New research', goal: '', state: 'new' },
];

const meta = {
  title: 'plugins/plugin-lighthouse/components/ResearchList',
  component: ResearchList,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-[36rem]' })],
  parameters: { translations },
} satisfies Meta<typeof ResearchList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { rows, onOpen: () => {}, onNew: () => {} } };

export const Empty: Story = { args: { rows: [], onNew: () => {} } };

export const Unreachable: Story = {
  args: {
    rows: rows.map(({ pages: _p, usd: _u, ...row }) => ({ ...row, state: 'unknown' as const })),
    error: 'Lighthouse at http://127.0.0.1:4319 did not answer.',
  },
};
