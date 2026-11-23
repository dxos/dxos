//
// Copyright 2025 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Util from '@dxos/react-ui/Util';

import { Initialize } from '#components';
import { Calendar } from '#types';

import { InboxNamespace } from '../../namespace.ts';

export type InitializeCalendarProps = {
  calendar: Calendar.Calendar;
};

export const InitializeCalendar = Util.composable<HTMLDivElement, InitializeCalendarProps>(
  ({ calendar, ...props }, forwardedRef) => {
    const { t } = Hooks.useTranslation(InboxNamespace.key);
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
