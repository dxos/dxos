//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, createContext, forwardRef, useCallback, useContext, useState } from 'react';

import { invariant } from '@dxos/invariant';
import {
  Input,
  ThemedClassName,
  ToggleGroup,
  ToggleGroupItem,
  composable,
  composableProps,
  useTranslation,
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import {
  MAX_MIN_INTERVAL_SECONDS,
  clampSchedule,
  describeCron,
  fromCron,
  scheduleIntervalSeconds,
  scheduleToCron,
} from './cron';
import { Days, type Day, type ScheduleValue } from './Schedule';

// Kept out of `Schedule.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/** Human-readable summary of the schedule, suitable for the header. */
// TODO(wittjosiah): Just use cronstrue for all cases?
const DAY_NAMES: Record<Day, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const withZone = (text: string, timezone?: string): string => (timezone ? `${text} ${timezone}` : text);

const formatTime = (time: string): string => {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return time;
  }

  const period = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};

export const describeSchedule = (value: ScheduleValue, timezone?: string): string => {
  switch (value.kind) {
    // case 'once':
    //   return value.date
    //     ? `Runs once at ${formatTime(value.date.slice(11))} on ${value.date.slice(0, 10)}`
    //     : 'Runs once';
    case 'hourly':
      return `Runs every hour at minute ${value.minute}`;
    case 'daily':
      return withZone(`Runs every day at ${formatTime(value.time)}`, timezone);
    case 'weekly': {
      const days =
        value.days.length === 0
          ? 'no days'
          : value.days.length === 1
            ? DAY_NAMES[value.days[0]]
            : Days.filter((d) => value.days.includes(d.value))
                .map((d) => d.label)
                .join(', ');
      return withZone(`Runs every ${days} at ${formatTime(value.time)}`, timezone);
    }
    case 'monthly':
      return withZone(`Runs monthly on day ${value.day} at ${formatTime(value.time)}`, timezone);
    case 'custom':
      return withZone(describeCron(value.cron), timezone);
  }
};
