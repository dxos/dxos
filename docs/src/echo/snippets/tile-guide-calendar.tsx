//
// Copyright 2026 DXOS.org
//

import React, { useRef, useState } from 'react';

import { Calendar, type CalendarEvent } from '@dxos/react-ui-calendar';
import * as Panel from '@dxos/react-ui/Panel';

// #region picker
/** A date picker: the grid scrolls through weeks, and the toolbar names the month in view. */
export const MonthPicker = () => (
  <Calendar.Root>
    <Calendar.Toolbar />
    <Calendar.Grid rows={6} />
  </Calendar.Root>
);
// #endregion

// #region week
/** An event at `hour` on the day `day` days after this week's Monday. */
const at = (day: number, hour: number, minutes = 0) => {
  const date = new Date();
  // `getDay` counts from Sunday; step back to Monday, then forward to the day.
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + day);
  date.setHours(hour, minutes, 0, 0);
  return date;
};

const WEEK: CalendarEvent[] = [
  { id: '1', title: 'Standup', start: at(0, 9), end: at(0, 9, 30) },
  { id: '2', title: 'Design review', start: at(1, 10), end: at(1, 11, 30) },
  { id: '3', title: 'Lunch', start: at(2, 12), end: at(2, 13) },
  { id: '4', title: 'Planning', start: at(3, 14), end: at(3, 15, 30) },
  { id: '5', title: 'Demo', start: at(4, 11), end: at(4, 12) },
];

/** A week of events: drag an empty slot to add one, drag an event to move it, or drag its edge to resize it. */
export const WeekPlanner = () => {
  const [events, setEvents] = useState(WEEK);
  const nextId = useRef(WEEK.length + 1);

  return (
    <Calendar.Root>
      <Panel.Root>
        <Panel.Header>
          <Calendar.Toolbar />
        </Panel.Header>
        <Calendar.Week
          events={events}
          onEventCreate={({ start, end }) =>
            setEvents((current) => [
              ...current,
              { id: String(nextId.current++), title: 'New event', start, end },
            ])
          }
          onEventUpdate={({ id, start, end }) =>
            setEvents((current) =>
              current.map((event) =>
                event.id === id ? { ...event, start, end } : event,
              ),
            )
          }
        />
      </Panel.Root>
    </Calendar.Root>
  );
};
// #endregion
