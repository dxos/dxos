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
  const calendarIntegration = integrations.find((integration) =>
    integration.targets.some((target) => target.object?.dxn.asEchoDXN()?.echoId === calendar.id),
  );

  const handleSync = useCallback(async () => {
    if (!calendarIntegration) {return;}
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

  // Gate sync on an Integration that directly references *this* calendar,
  // not on the mere presence of a Google token in the space — a token from
  // an unrelated integration may have the wrong scopes (e.g. mail-only) and
  // isn't a green light to sync calendar.
  if (!calendarIntegration) {
    // Pass the current Calendar through as `existingTarget` so the OAuth
    // flow attaches *this* calendar to the first sync target the user picks
    // from the post-OAuth checklist, instead of materializing a fresh one.
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
      <Button onClick={handleSync} disabled={syncing}>
        {t('sync-calendar.label')}
      </Button>
    </div>
  );
});

NewCalendar.displayName = 'NewCalendar';
