//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Obj } from '@dxos/echo';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { getRoutinesSettingsPath } from '@dxos/plugin-routine';
import { Form } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Flex from '@dxos/react-ui/Flex';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as IconButton from '@dxos/react-ui/IconButton';

import { useSyncTrigger } from '#hooks';
import { meta } from '#meta';
import { Calendar } from '#types';

export type CalendarPropertiesProps = AppSurface.ObjectPropertiesProps<Calendar.Calendar>;

export const CalendarProperties = ({ subject }: CalendarPropertiesProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
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
      <Field.Root>
        <Field.Label>{t('calendar-sync.label')}</Field.Label>
        {/* TODO(burdon): Replace custom components with Field.Switch. */}
        <Flex.Root gap='xs'>
          <Button.Group>
            <Button.Root onClick={handleToggleSync} disabled={pending}>
              {pending
                ? t('enabling-background-sync.label')
                : syncEnabled
                  ? t('disable-background-sync.label')
                  : t('enable-background-sync.label')}
            </Button.Root>
            {syncTrigger && (
              <IconButton.Root
                iconOnly
                icon='ph--gear--regular'
                label={t('view-trigger.label')}
                onClick={handleViewTrigger}
              />
            )}
          </Button.Group>
        </Flex.Root>
      </Field.Root>
    </Form.FieldSet>
  );
};

CalendarProperties.displayName = 'CalendarProperties';
