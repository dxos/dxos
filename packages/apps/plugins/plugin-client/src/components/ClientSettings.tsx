//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue } from '@braneframe/plugin-settings';
import { defs } from '@dxos/config';
import { Input, Select, useTranslation } from '@dxos/react-ui';

import { type ClientSettingsProps } from '../ClientPlugin';
import { CLIENT_PLUGIN } from '../meta';

const StorageAdapters = {
  opfs: defs.Runtime.Client.Storage.StorageDriver.WEBFS,
  idb: defs.Runtime.Client.Storage.StorageDriver.IDB,
} as const;

export const ClientSettings = ({ settings }: { settings: ClientSettingsProps }) => {
  const { t } = useTranslation(CLIENT_PLUGIN);

  return (
    <>
      <SettingsValue label={t('enable experimental automerge backend')}>
        <Input.Switch checked={settings.automerge} onCheckedChange={(checked) => (settings.automerge = !!checked)} />
      </SettingsValue>
      <SettingsValue label={t('choose storage adaptor')}>
        <Select.Root
          value={Object.entries(StorageAdapters).find(([name, value]) => value === settings.storageDriver)?.[0]}
          onValueChange={(value) => {
            settings.storageDriver = StorageAdapters[value as keyof typeof StorageAdapters];
          }}
        >
          <Select.TriggerButton placeholder={t('data store label')}/>
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {Object.keys(StorageAdapters).map((key) => (
                  <Select.Option key={key} value={key}>
                    {t(`settings storage adaptor ${key} label`)}
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
