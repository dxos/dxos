//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { DXN, type Feed, Obj } from '@dxos/echo';
import { type JsonPath, splitJsonPath } from '@dxos/echo/internal';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { Button, ButtonGroup, IconButton, useTranslation } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';

import { useSyncTrigger } from '../../hooks';
import { meta } from '../../meta';
import { Calendar } from '../../types';

export const CalendarSettings = ({ subject }: SurfaceComponentProps<Feed.Feed>) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const db = useMemo(() => Obj.getDatabase(subject), [subject]);

  const configs = useQuery(db, Filter.type(Calendar.Config));
  const config = useMemo(
    () => configs.find((config) => DXN.equalsEchoId(config.feed.dxn, Obj.getDXN(subject))),
    [configs, subject],
  );

  const handleConfigChange = useCallback(
    (values: any, { isValid, changed }: { isValid: boolean; changed: Record<JsonPath, boolean> }) => {
      if (!isValid || !config) {
        return;
      }

      const changedPaths = Object.keys(changed).filter((path) => changed[path as JsonPath]) as JsonPath[];
      if (changedPaths.length > 0) {
        Obj.change(config, () => {
          for (const path of changedPaths) {
            const parts = splitJsonPath(path);
            const value = Obj.getValue(values, parts);
            Obj.setValue(config, parts, value);
          }
        });
      }
    },
    [config],
  );

  const { syncEnabled, syncTrigger, pending, handleToggleSync } = useSyncTrigger({
    db,
    subject,
    functionKey: 'dxos.org/function/inbox/google-calendar-sync',
  });

  const handleViewTrigger = useCallback(() => {
    if (!db) {
      return;
    }
    void invokePromise(LayoutOperation.Open, {
      subject: [`automation-settings${ATTENDABLE_PATH_SEPARATOR}${db.spaceId}`],
      workspace: db.spaceId,
    });
  }, [invokePromise, db]);

  return (
    <div className='flex flex-col gap-4'>
      {config && (
        <Form.Root schema={omitId(Calendar.Config)} values={config} db={db} onValuesChanged={handleConfigChange}>
          <Form.Viewport>
            <Form.Content>
              <Form.FieldSet />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      )}
      <h2>{t('calendar sync label')}</h2>
      <div className='p-1 flex flex-row gap-1'>
        <ButtonGroup>
          <Button onClick={handleToggleSync} disabled={pending}>
            {pending
              ? t('enabling background sync label')
              : syncEnabled
                ? t('disable background sync label')
                : t('enable background sync label')}
          </Button>
          {syncTrigger && (
            <IconButton iconOnly icon='ph--gear--regular' label={t('view trigger label')} onClick={handleViewTrigger} />
          )}
        </ButtonGroup>
      </div>
    </div>
  );
};
