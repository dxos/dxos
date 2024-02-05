//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue } from '@braneframe/plugin-settings';
import { Input, Select, useTranslation } from '@dxos/react-ui';

import { type ClientSettingsProps } from '../ClientPlugin';
import { CLIENT_PLUGIN } from '../meta';

const StorageAdapters = ['opfs', 'idb'] as const;

export const ClientSettings = ({ settings }: { settings: ClientSettingsProps }) => {
  const { t } = useTranslation(CLIENT_PLUGIN);

  return (
    <>
      <SettingsValue label={t('enable experimental automerge backend')}>
        <Input.Switch checked={settings.automerge} onCheckedChange={(checked) => (settings.automerge = !!checked)} />
      </SettingsValue>
      <SettingsValue label={t('choose storage adaptor')}>
        <Select.Root
          value={settings.storageAdapter}
          onValueChange={(value) => {
            settings.storageAdapter = value === 'opfs' ? 'opfs' : 'idb';
          }}
        >
          <Select.TriggerButton />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {StorageAdapters.map((adapter) => (
                  <Select.Option key={adapter} value={adapter}>
                    {t(`settings storage adaptor ${adapter} label`)}
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </SettingsValue>
    </>
  );
};
