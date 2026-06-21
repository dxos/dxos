//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { type ComputeEnvironment } from '@dxos/client-protocol';
import { useObject } from '@dxos/echo-react';
import { DropdownMenu, IconButton, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '#meta';

export type AutomationSettingsProps = AppSurface.SpaceArticleProps;

/**
 * Space-level automation settings. Individual automations are now first-class objects (configured in their
 * article + per-object companion), so this page is focused on runtime management — where the space's
 * automations execute.
 */
export const AutomationSettings = ({ space }: AutomationSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [properties, changeProperties] = useObject(space.properties);
  const selected = properties.computeEnvironment ?? 'local';

  const handleUpdate = (option: ComputeEnvironment) => {
    changeProperties((draft) => {
      draft.computeEnvironment = option;
    });
  };

  // TODO(burdon): Factor out.
  return (
    <Settings.Viewport>
      <Settings.Section title={t('automation-verbose.label')} description={t('automation.description')}>
        <div className='grid grid-cols-1 md:grid-cols-[1fr_min-content]'>
          <Settings.Item title={t('runtime.label')} description={t('runtime.description')}>
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
          </Settings.Item>
        </div>
      </Settings.Section>
    </Settings.Viewport>
  );
};
