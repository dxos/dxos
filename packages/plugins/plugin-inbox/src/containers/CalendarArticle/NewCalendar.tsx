//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Surface, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { Integration } from '@dxos/plugin-integration/types';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { AccessToken } from '@dxos/types';
import { composable, composableProps } from '@dxos/ui-theme';

import { meta } from '#meta';
import { InboxOperation } from '#operations';
import { type Calendar } from '#types';

import { GOOGLE_CALENDAR_PROVIDER_ID } from '../../capabilities/integration-provider';

export type NewCalendarProps = {
  calendar: Calendar.Calendar;
};

/**
 * Empty state for the calendar: guides the user through connecting an integration or syncing.
 */
export const NewCalendar = composable<HTMLDivElement, NewCalendarProps>(({ calendar, ...props }, forwardedRef) => {
  const db = Obj.getDatabase(calendar);
  const tokens = useQuery(db, Filter.type(AccessToken.AccessToken));
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const pluginManager = usePluginManager();
  const [syncing, setSyncing] = useState(false);

  const openSpaceSettings = useCallback(() => {
    if (db) {
      void invokePromise(LayoutOperation.Open, {
        subject: [`${getSpacePath(db.spaceId)}/settings/org.dxos.plugin.token-manager.integrations`],
        workspace: getSpacePath(db.spaceId),
      });
    }
  }, [db, invokePromise]);

  const integrations = useQuery(db, Filter.type(Integration.Integration));
  const calendarParent = integrations.find((integration) =>
    integration.targets.some((target) => target.object?.dxn.asEchoDXN()?.echoId === calendar.id),
  );

  const handleSync = useCallback(async () => {
    if (!calendarParent) return;
    setSyncing(true);
    try {
      await invokePromise(InboxOperation.SyncCalendar, {
        integration: Ref.make(calendarParent),
        calendar: Ref.make(calendar),
      });
    } finally {
      setSyncing(false);
    }
  }, [invokePromise, calendar, calendarParent]);

  const googleToken = tokens.find((token) => token.source.includes('google'));
  if (!googleToken) {
    const authSurfaceData = { providerId: GOOGLE_CALENDAR_PROVIDER_ID };
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
        <Button onClick={openSpaceSettings}>{t('manage-integrations-button.label')}</Button>
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
      <Button onClick={handleSync} disabled={syncing || !calendarParent}>
        {t('sync-calendar.label')}
      </Button>
    </div>
  );
});

NewCalendar.displayName = 'NewCalendar';
