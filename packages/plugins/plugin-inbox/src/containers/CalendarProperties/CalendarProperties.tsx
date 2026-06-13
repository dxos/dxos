//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Button, ButtonGroup, IconButton, Input, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { useSyncTrigger } from '#hooks';
import { meta } from '#meta';
import { Calendar } from '#types';

export type CalendarPropertiesProps = AppSurface.ObjectPropertiesProps<Calendar.Calendar>;

export const CalendarProperties = ({ subject }: CalendarPropertiesProps) => {
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
    <Form.Section>
      <Input.Root>
        <Input.Label>{t('calendar-sync.label')}</Input.Label>
        {/* TODO(burdon): Replace custom components with Input.Switch. */}
        <div className='flex gap-1'>
          <ButtonGroup>
            <Button onClick={handleToggleSync} disabled={pending}>
              {pending
                ? t('enabling-background-sync.label')
                : syncEnabled
                  ? t('disable-background-sync.label')
                  : t('enable-background-sync.label')}
            </Button>
            {syncTrigger && (
              <IconButton
                iconOnly
                icon='ph--gear--regular'
                label={t('view-trigger.label')}
                onClick={handleViewTrigger}
              />
            )}
          </ButtonGroup>
        </div>
      </Input.Root>
    </Form.Section>
  );
};
