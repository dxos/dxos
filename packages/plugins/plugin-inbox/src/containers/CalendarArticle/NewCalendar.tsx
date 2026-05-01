//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Surface, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { getSpacePath } from '@dxos/app-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { Integration } from '@dxos/plugin-integration/types';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/ui-theme';

import { meta } from '#meta';
import { InboxOperation } from '#operations';
import { type Calendar } from '#types';

import { GOOGLE_CALENDAR_PROVIDER_ID } from '../../constants';

export type NewCalendarProps = {
  calendar: Calendar.Calendar;
};

/**
 * Empty state for the calendar: guides the user through connecting an integration or syncing.
 */
export const NewCalendar = composable<HTMLDivElement, NewCalendarProps>(({ calendar, ...props }, forwardedRef) => {
  const db = Obj.getDatabase(calendar);
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const pluginManager = usePluginManager();
  const [syncing, setSyncing] = useState(false);

  const integrations = useQuery(db, Filter.type(Integration.Integration));
  const calendarIntegration = integrations.find((integration) =>
    integration.targets.some((target) => target.object?.dxn.asEchoDXN()?.echoId === calendar.id),
  );

  const handleSync = useCallback(async () => {
    if (!calendarIntegration) {
      return;
    }
    setSyncing(true);
    try {
      await invokePromise(InboxOperation.SyncCalendar, {
        integration: Ref.make(calendarIntegration),
        calendar: Ref.make(calendar),
      });
    } finally {
      setSyncing(false);
    }
  }, [invokePromise, calendar, calendarIntegration]);

  if (!calendarIntegration) {
    const authSurfaceData = { providerId: GOOGLE_CALENDAR_PROVIDER_ID, existingTarget: Ref.make(calendar) };
    const hasAuthSurface = Surface.isAvailable(pluginManager.capabilities, {
      role: 'integration--auth',
      data: authSurfaceData,
    });

    if (hasAuthSurface) {
      return (
        <div
          {...composableProps(props)}
          ref={forwardedRef}
          {...composableProps(props, { classNames: 'flex flex-col items-center gap-4 p-8' })}
        >
          <p className='text-description'>{t('no-integrations.label')}</p>
          <Surface.Surface role='integration--auth' data={authSurfaceData} limit={1} />
        </div>
      );
    }

    return (
      <div
        {...composableProps(props)}
        ref={forwardedRef}
        {...composableProps(props, { classNames: 'flex flex-col items-center gap-4 p-8' })}
      >
        <p className='text-description'>{t('no-integrations.label')}</p>
      </div>
    );
  }

  return (
    <div
      {...composableProps(props)}
      ref={forwardedRef}
      {...composableProps(props, { classNames: 'flex flex-col items-center gap-4 p-8' })}
    >
      <p className='text-description'>{t('empty-calendar.message')}</p>
      <Button onClick={handleSync} disabled={syncing}>
        {t('sync-calendar.label')}
      </Button>
    </div>
  );
});

NewCalendar.displayName = 'NewCalendar';
