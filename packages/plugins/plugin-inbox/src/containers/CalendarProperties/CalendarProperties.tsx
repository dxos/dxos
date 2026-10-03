//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Obj } from '@dxos/echo';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as RoutinePath from '@dxos/plugin-routine/RoutinePath';
import { Form } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Flex from '@dxos/react-ui/Flex';
import * as Group from '@dxos/react-ui/Group';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { useSyncTrigger } from '#hooks';
import { meta } from '#meta';
import { Calendar } from '#types';

export type CalendarPropertiesProps = AppSurface.ObjectPropertiesProps<Calendar.Calendar>;

export const CalendarProperties = ({ subject }: CalendarPropertiesProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const db = useMemo(() => Obj.getDatabase(subject), [subject]);
  const connectors = Hooks.useCapabilities(ConnectorSpec.Connector);

  const { syncEnabled, syncTrigger, pending, handleToggleSync } = useSyncTrigger({ db, subject, connectors });

  const handleViewTrigger = useCallback(() => {
    if (!db) {
      return;
    }
    void invokePromise(LayoutOperation.Open, {
      subject: [RoutinePath.getRoutinesSettingsPath(db.spaceId)],
      workspace: GraphPath.getSpacePath(db.spaceId),
    });
  }, [invokePromise, db]);

  return (
    <Form.FieldSet>
      <Field.Root>
        <Field.Label>{t('calendar-sync.label')}</Field.Label>
        {/* TODO(burdon): Replace custom components with Field.Switch. */}
        <Flex.Flex gap='xs'>
          <Group.Group>
            <Button.Button onClick={handleToggleSync} disabled={pending}>
              {pending
                ? t('enabling-background-sync.label')
                : syncEnabled
                  ? t('disable-background-sync.label')
                  : t('enable-background-sync.label')}
            </Button.Button>
            {syncTrigger && (
              <Button.Button
                iconOnly
                icon='ph--gear--regular'
                label={t('view-trigger.label')}
                onClick={handleViewTrigger}
              />
            )}
          </Group.Group>
        </Flex.Flex>
      </Field.Root>
    </Form.FieldSet>
  );
};

CalendarProperties.displayName = 'CalendarProperties';
