//
// Copyright 2023 DXOS.org
//

import localforage from 'localforage';
import React from 'react';

import { SettingsValue } from '@braneframe/plugin-settings';
import { defs } from '@dxos/config';
import { Input, Select, useTranslation } from '@dxos/react-ui';

import { useAsyncEffect } from '../../../../../common/react-async/src';
import { type ClientSettingsProps } from '../ClientPlugin';
import { CLIENT_PLUGIN } from '../meta';

const StorageAdapters = {
  opfs: defs.Runtime.Client.Storage.StorageDriver.WEBFS,
  idb: defs.Runtime.Client.Storage.StorageDriver.IDB,
} as const;

export const ClientSettings = ({ settings }: { settings: ClientSettingsProps }) => {
  const { t } = useTranslation(CLIENT_PLUGIN);
  const [storageDriver, setStorageDriver] = React.useState<defs.Runtime.Client.Storage.StorageDriver>();

  useAsyncEffect(async () => {
    const storageDriver = await localforage.getItem<defs.Runtime.Client.Storage.StorageDriver>(
      'dxos.org/settings/storage-driver',
    );
    storageDriver && setStorageDriver(storageDriver);
  }, []);

  return (
    <>
      <SettingsValue label={t('enable experimental automerge backend')}>
        <Input.Switch checked={settings.automerge} onCheckedChange={(checked) => (settings.automerge = !!checked)} />
      </SettingsValue>
      <SettingsValue label={t('choose storage adaptor')}>
        <Select.Root
          value={Object.entries(StorageAdapters).find(([name, value]) => value === storageDriver)?.[0]}
          onValueChange={(value) => {
            if (confirm(t('storage adapter changed alert'))) {
              const newStorageDriver = StorageAdapters[value as keyof typeof StorageAdapters];
              setStorageDriver(newStorageDriver);
              queueMicrotask(async () => {
                await localforage.setItem('dxos.org/settings/storage-driver', newStorageDriver);
              });
            }
          }}
        >
          <Select.TriggerButton placeholder={t('data store label')} />
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
