//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Select, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { FileCapabilities, Settings } from '#types';

export type FileSettingsProps = AppSurface.SettingsProps<Settings.Settings>;

export const FileSettings = ({ settings, onSettingsChange }: FileSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
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
    <Form.Root
      schema={Settings.Settings}
      values={settings}
      variant='settings'
      readonly={!onSettingsChange}
      onValuesChanged={(values) => onSettingsChange?.((current) => ({ ...current, ...values }))}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={t('settings.title')}>
            <Form.Row
              label={t('settings.backend.label')}
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
            </Form.Row>
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
