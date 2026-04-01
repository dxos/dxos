//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Surface, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { AccessToken } from '@dxos/types';
import { composable, composableProps } from '@dxos/ui-theme';

import { meta } from '../../meta';
import { InboxOperation } from '../../operations';
import { type Calendar } from '../../types';

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

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await invokePromise(InboxOperation.SyncCalendar, { calendar });
    } finally {
      setSyncing(false);
    }
  }, [invokePromise, calendar]);

  const googleToken = tokens.find((token) => token.source.includes('google'));
  if (!googleToken) {
    const authSurfaceData = { source: 'google.com' };
    const hasAuthSurface = Surface.isAvailable(pluginManager.capabilities, {
      role: 'integration--auth',
      data: authSurfaceData,
    });

    if (hasAuthSurface) {
      return (
        <div {...composableProps(props)} ref={forwardedRef} className='flex flex-col items-center gap-4 p-8'>
          <p className='text-description'>{t('no integrations label')}</p>
          <Surface.Surface role='integration--auth' data={authSurfaceData} limit={1} />
        </div>
      );
    }

    return (
      <div {...composableProps(props)} ref={forwardedRef} className='flex flex-col items-center gap-4 p-8'>
        <p className='text-description'>{t('no integrations label')}</p>
        <Button onClick={openSpaceSettings}>{t('manage integrations button label')}</Button>
      </div>
    );
  }

  return (
    <div {...composableProps(props)} ref={forwardedRef} className='flex flex-col items-center gap-4 p-8'>
      <p className='text-description'>{t('empty calendar message')}</p>
      <Button onClick={handleSync} disabled={syncing}>
        {t('sync calendar label')}
      </Button>
    </div>
  );
});

NewCalendar.displayName = 'NewCalendar';
