//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useClient } from '@dxos/react-client';
import { Select, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { FileCapabilities, Settings } from '#types';

export type FileSettingsProps = AppSurface.SettingsProps<Settings.Settings>;

export const FileSettings = ({ settings, onSettingsChange }: FileSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const client = useClient();
  const backends = useCapabilities(FileCapabilities.Backend);
  // No explicit choice defers to the Blob registry's own configured default (edge when
  // configured, inline otherwise), so the Select reflects what an upload will actually use.
  const requested = settings.backend ? backends.find((b) => b.storage === settings.backend) : undefined;
  const active = requested ?? backends.find((b) => b.storage === client.graph.defaultBlobStorage) ?? backends[0];
  // Use the resolved backend's storage name so the Select never shows a missing/stale value.
  const activeStorage = active?.storage ?? Settings.DEFAULT_BACKEND_STORAGE;

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
          <Form.Section title={meta.profile.name ?? meta.profile.key}>
            <Form.Row
              label={t('settings.backend.label')}
              description={active?.description ?? t('settings.backend.description')}
            >
              <Select.Root value={activeStorage} onValueChange={handleChange} disabled={!onSettingsChange}>
                <Select.TriggerButton placeholder={t('settings.backend.placeholder')} />
                <Select.Portal>
                  <Select.Content>
                    <Select.Viewport>
                      {backends.map((backend) => (
                        <Select.Option key={backend.storage} value={backend.storage}>
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

FileSettings.displayName = 'FileSettings';
