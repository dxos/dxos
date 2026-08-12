//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { composable } from '@dxos/react-ui';

import { Initialize } from '#components';
import { meta } from '#meta';
import { Calendar } from '#types';

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
