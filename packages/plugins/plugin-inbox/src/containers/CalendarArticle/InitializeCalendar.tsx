//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { composable } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Calendar } from '#types';

import { Initialize, InitializeAction } from '../../components';
import { GOOGLE_CALENDAR_CONNECTOR_ID } from '../../constants';

// Stable reference for the ConnectorAuth Surface's `connectorIds` (avoids a new array each render).
const CONNECTOR_IDS = [GOOGLE_CALENDAR_CONNECTOR_ID];

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
        noIntegrationMessage={t('no-integrations.label')}
        emptyMessage={t('empty-calendar.message')}
        ref={forwardedRef}
      />
    );
  },
);

InitializeCalendar.displayName = 'InitializeCalendar';

export const InitializeCalendarAction = ({ calendar }: InitializeCalendarProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <InitializeAction
      target={calendar}
      connectorIds={CONNECTOR_IDS}
      syncLabel={t('sync-calendar.label')}
      notify={{
        success: ['sync-calendar-success.title', { ns: meta.profile.key }],
        error: ['sync-calendar-error.title', { ns: meta.profile.key }],
      }}
    />
  );
};
