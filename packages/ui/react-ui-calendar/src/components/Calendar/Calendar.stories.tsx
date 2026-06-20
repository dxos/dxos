//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { addDays, addMinutes, format, startOfDay, startOfWeek } from 'date-fns';
import React, { useMemo, useRef, useState } from 'react';

import { Panel } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Calendar, type CalendarEvent, type Range as DateRange } from './Calendar';

const meta = {
  title: 'ui/react-ui-calendar/Calendar',
  component: Calendar.Grid,
  parameters: {
    translations,
  },
} satisfies Meta<typeof Calendar.Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  render: () => (
    <Calendar.Root>
      <Calendar.Toolbar />
      <Calendar.Grid rows={6} />
    </Calendar.Root>
  ),
};

export const Range: Story = {
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  render: () => {
    const [range, setRange] = useState<DateRange | undefined>();
    return (
      <div className='flex flex-col gap-2'>
        <Calendar.Root>
          <Calendar.Toolbar />
          <Calendar.Grid rows={6} onSelectRange={({ range }) => setRange(range)} />
        </Calendar.Root>
        <div className='text-sm text-description text-center'>
          {range ? `${format(range.from, 'PP')} → ${format(range.to, 'PP')}` : 'Drag across days to select a range.'}
        </div>
      </div>
    );
  },
};

export const Column: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-auto' })],
  render: () => (
    <Calendar.Root>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Calendar.Toolbar />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Calendar.Grid />
        </Panel.Content>
      </Panel.Root>
    </Calendar.Root>
  ),
};

export const Week: StoryObj<typeof Calendar.Week> = {
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-auto' })],
  render: () => {
    const idRef = useRef(100);
    const initial = useMemo<CalendarEvent[]>(() => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const at = (dayOffset: number, hour: number, minute = 0) =>
        addMinutes(startOfDay(addDays(weekStart, dayOffset)), hour * 60 + minute);
      return [
        { id: '1', title: 'Standup', start: at(1, 9, 0), end: at(1, 9, 30) },
        { id: '2', title: 'Design review', start: at(1, 9, 15), end: at(1, 10, 30) },
        { id: '3', title: 'Lunch', start: at(2, 12, 0), end: at(2, 13, 0) },
        { id: '4', title: '1:1', start: at(3, 14, 0), end: at(3, 15, 0) },
        { id: '5', title: 'Focus', start: at(3, 14, 30), end: at(3, 16, 0) },
        { id: '6', title: 'Planning', start: at(4, 10, 0), end: at(4, 11, 30) },
      ];
    }, []);
    const [events, setEvents] = useState<CalendarEvent[]>(initial);

    return (
      <Calendar.Root>
        <Panel.Root>
          <Panel.Toolbar asChild>
            <Calendar.Toolbar />
          </Panel.Toolbar>
          <Calendar.Week
            events={events}
            onEventCreate={({ start, end }) =>
              setEvents((current) => [...current, { id: `${idRef.current++}`, title: 'New event', start, end }])
            }
            onEventUpdate={({ id, start, end }) =>
              setEvents((current) => current.map((event) => (event.id === id ? { ...event, start, end } : event)))
            }
          />
        </Panel.Root>
      </Calendar.Root>
    );
  },
};
