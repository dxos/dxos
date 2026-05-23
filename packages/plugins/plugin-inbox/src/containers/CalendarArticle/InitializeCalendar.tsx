//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { composable } from '@dxos/react-ui';

import { meta } from '#meta';
import { InboxOperation } from '#types';
import { type Calendar } from '#types';

import { Initialize, InitializeAction } from '../../components';
import { GOOGLE_CALENDAR_PROVIDER_ID } from '../../constants';

export type InitializeCalendarProps = {
  calendar: Calendar.Calendar;
};

export const InitializeCalendar = composable<HTMLDivElement, InitializeCalendarProps>(
  ({ calendar, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    return (
      <Initialize
        {...props}
        target={calendar}
        noIntegrationMessage={t('no-integrations.label')}
        emptyMessage={t('empty-calendar.message')}
        ref={forwardedRef}
      />
    );
  },
);

InitializeCalendar.displayName = 'InitializeCalendar';

export const InitializeCalendarAction = ({ calendar }: InitializeCalendarProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <InitializeAction
      target={calendar}
      targetKey='calendar'
      providerId={GOOGLE_CALENDAR_PROVIDER_ID}
      operation={InboxOperation.SyncCalendar}
      syncLabel={t('sync-calendar.label')}
    />
  );
};
