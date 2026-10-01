//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { getRoutinesSettingsPath } from '@dxos/plugin-routine';
import { Flex, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Next } from '@dxos/react-ui/next';

import { useSyncTrigger } from '#hooks';
import { meta } from '#meta';
import { Calendar } from '#types';

export type CalendarPropertiesProps = AppSurface.ObjectPropertiesProps<Calendar.Calendar>;

export const CalendarProperties = ({ subject }: CalendarPropertiesProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const db = useMemo(() => Obj.getDatabase(subject), [subject]);
  const connectors = useCapabilities(ConnectorSpec.Connector);

  const { syncEnabled, syncTrigger, pending, handleToggleSync } = useSyncTrigger({ db, subject, connectors });

  const handleViewTrigger = useCallback(() => {
    if (!db) {
      return;
    }
    void invokePromise(LayoutOperation.Open, {
      subject: [getRoutinesSettingsPath(db.spaceId)],
      workspace: GraphPath.getSpacePath(db.spaceId),
    });
  }, [invokePromise, db]);

  return (
    <Form.FieldSet>
      <Next.Field.Root>
        <Next.Field.Label>{t('calendar-sync.label')}</Next.Field.Label>
        {/* TODO(burdon): Replace custom components with Field.Switch. */}
        <Flex gap='xs'>
          <Next.Group>
            <Next.Button onClick={handleToggleSync} disabled={pending}>
              {pending
                ? t('enabling-background-sync.label')
                : syncEnabled
                  ? t('disable-background-sync.label')
                  : t('enable-background-sync.label')}
            </Next.Button>
            {syncTrigger && (
              <Next.Button
                iconOnly
                icon='ph--gear--regular'
                label={t('view-trigger.label')}
                onClick={handleViewTrigger}
              />
            )}
          </Next.Group>
        </Flex>
      </Next.Field.Root>
    </Form.FieldSet>
  );
};

CalendarProperties.displayName = 'CalendarProperties';
