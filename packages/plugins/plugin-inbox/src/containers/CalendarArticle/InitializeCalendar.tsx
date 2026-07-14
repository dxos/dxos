//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { composable } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Calendar } from '#types';

import { Initialize, InitializeAction } from '../../components';

export type InitializeCalendarProps = {
  calendar: Calendar.Calendar;
};

export const InitializeCalendar = composable<HTMLDivElement, InitializeCalendarProps>(
  ({ calendar, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.profile.key);
    return (
      <Initialize
        {...props}
        target={calendar}
        noConnectionsMessage={t('no-connections.label')}
        emptyMessage={t('empty-calendar.message')}
        ref={forwardedRef}
      />
    );
  },
);

InitializeCalendar.displayName = 'InitializeCalendar';

export const InitializeCalendarAction = ({ calendar }: InitializeCalendarProps) => {
  const { t } = useTranslation(meta.profile.key);
  // The connect dropdown shown when the calendar isn't connected yet is contributed by this plugin's
  // own app-graph-builder (`calendarConnectorAuth`), keyed on the calendar's own graph node id.
  return (
    <InitializeAction
      target={calendar}
      nodeId={calendar.id}
      syncLabel={t('sync-calendar.label')}
      notify={{
        success: ['sync-calendar-success.title', { ns: meta.profile.key }],
        error: ['sync-calendar-error.title', { ns: meta.profile.key }],
      }}
    />
  );
};
