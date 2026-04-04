//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Button, ButtonGroup, IconButton, useTranslation } from '@dxos/react-ui';

import { useSyncTrigger } from '../../hooks';
import { meta } from '../../meta';
import { Calendar } from '../../types';

export const CalendarSettings = ({ subject }: ObjectSurfaceProps<Calendar.Calendar>) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const db = useMemo(() => Obj.getDatabase(subject), [subject]);

  const { syncEnabled, syncTrigger, pending, handleToggleSync } = useSyncTrigger({
    db,
    subject,
    functionKey: 'org.dxos.function.inbox.google-calendar-sync',
  });

  const handleViewTrigger = useCallback(() => {
    if (!db) {
      return;
    }
    void invokePromise(LayoutOperation.Open, {
      subject: [`${getSpacePath(db.spaceId)}/settings/org.dxos.plugin.automation.automations`],
      workspace: getSpacePath(db.spaceId),
    });
  }, [invokePromise, db]);

  return (
    <div className='flex flex-col gap-4'>
      <h2>{t('calendar-sync.label')}</h2>
      <div className='p-1 flex flex-row gap-1'>
        <ButtonGroup>
          <Button onClick={handleToggleSync} disabled={pending}>
            {pending
              ? t('enabling-background-sync.label')
              : syncEnabled
                ? t('disable-background-sync.label')
                : t('enable-background-sync.label')}
          </Button>
          {syncTrigger && (
            <IconButton iconOnly icon='ph--gear--regular' label={t('view-trigger.label')} onClick={handleViewTrigger} />
          )}
        </ButtonGroup>
      </div>
    </div>
  );
};
