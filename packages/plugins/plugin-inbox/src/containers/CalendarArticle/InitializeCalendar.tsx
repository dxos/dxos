//
// Copyright 2025 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Util from '@dxos/react-ui/Util';

import { Initialize } from '#components';
import { meta } from '#meta';
import { Calendar } from '#types';

export type InitializeCalendarProps = {
  calendar: Calendar.Calendar;
};

export const InitializeCalendar = Util.composable<HTMLDivElement, InitializeCalendarProps>(
  ({ calendar, ...props }, forwardedRef) => {
    const { t } = Hooks.useTranslation(meta.profile.key);
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
