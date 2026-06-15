//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Select, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { FileCapabilities, Settings } from '#types';

export type FileSettingsProps = AppSurface.SettingsArticleProps<Settings.Settings>;

export const FileSettings = ({ settings, onSettingsChange }: FileSettingsProps) => {
  const { t } = useTranslation(meta.id);
  const backends = useCapabilities(FileCapabilities.Backend);
  const requestedId = settings.backend ?? Settings.DEFAULT_BACKEND_ID;
  const active =
    backends.find((b) => b.id === requestedId) ?? backends.find((b) => b.id === Settings.DEFAULT_BACKEND_ID);
  // Use the resolved backend id so the Select never shows a missing/stale value.
  const activeId = active?.id ?? Settings.DEFAULT_BACKEND_ID;

  const handleChange = useCallback(
    (value: string) => onSettingsChange?.((current) => ({ ...current, backend: value })),
    [onSettingsChange],
  );

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title')}>
        <SettingsForm.Item
          title={t('settings.backend.label')}
          description={active?.description ?? t('settings.backend.description')}
        >
          <Select.Root value={activeId} onValueChange={handleChange} disabled={!onSettingsChange}>
            <Select.TriggerButton placeholder={t('settings.backend.placeholder')} />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {backends.map((backend) => (
                    <Select.Option key={backend.id} value={backend.id}>
                      {backend.name}
                    </Select.Option>
                  ))}
                </Select.Viewport>
                <Select.Arrow />
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </SettingsForm.Item>
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
