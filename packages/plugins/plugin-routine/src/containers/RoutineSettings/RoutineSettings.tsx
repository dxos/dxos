//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { type ComputeEnvironment } from '@dxos/client-protocol';
import { useObject } from '@dxos/echo-react';
import { DropdownMenu, IconButton, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

export type RoutineSettingsProps = AppSurface.SpaceArticleProps;

/**
 * Space-level routine settings. Individual routines are now first-class objects (configured in their
 * article + per-object companion), so this page is focused on runtime management — where the space's
 * routines execute.
 */
export const RoutineSettings = ({ space }: RoutineSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [properties, changeProperties] = useObject(space.properties);
  const selected = properties.computeEnvironment ?? 'local';

  const handleUpdate = (option: ComputeEnvironment) => {
    changeProperties((current) => {
      current.computeEnvironment = option;
    });
  };

  return (
    <Form.Root variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={t('routine-verbose.label')} description={t('routine.description')}>
            <Form.Row label={t('runtime.label')} description={t('runtime.description')}>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <IconButton iconEnd icon='ph--caret-down--regular' size={4} label={t(`runtime.${selected}.label`)} />
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content side='bottom'>
                    <DropdownMenu.Viewport>
                      <DropdownMenu.Item onClick={() => handleUpdate('disabled')}>
                        {t('runtime.disabled.label')}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onClick={() => handleUpdate('local')}>
                        {t('runtime.local.label')}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onClick={() => handleUpdate('edge')}>
                        {t('runtime.edge.label')}
                      </DropdownMenu.Item>
                    </DropdownMenu.Viewport>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </Form.Row>
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
