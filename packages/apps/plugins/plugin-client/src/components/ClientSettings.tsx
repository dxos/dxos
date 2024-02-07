//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue } from '@braneframe/plugin-settings';
import { type ConfigProto, Storage, defs, SaveConfig } from '@dxos/config';
import { Input, Select, useTranslation } from '@dxos/react-ui';
import { assignDeep } from '@dxos/util';

import { useAsyncEffect } from '../../../../../common/react-async/src';
import { type ClientSettingsProps } from '../ClientPlugin';
import { CLIENT_PLUGIN } from '../meta';

const StorageAdapters = {
  opfs: defs.Runtime.Client.Storage.StorageDriver.WEBFS,
  idb: defs.Runtime.Client.Storage.StorageDriver.IDB,
} as const;

export const ClientSettings = ({ settings }: { settings: ClientSettingsProps }) => {
  const { t } = useTranslation(CLIENT_PLUGIN);
  // TODO(mykola): Get updates from other places that change Config.
  const [storageConfig, setStorageConfig] = React.useState<ConfigProto>();

  useAsyncEffect(async () => {
    const config = await Storage();
    config && setStorageConfig(config);
  }, []);

  return (
    <>
      <SettingsValue label={t('enable experimental automerge backend')}>
        <Input.Switch checked={settings.automerge} onCheckedChange={(checked) => (settings.automerge = !!checked)} />
      </SettingsValue>
      <SettingsValue label={t('choose storage adaptor')}>
        <Select.Root
          value={
            Object.entries(StorageAdapters).find(
              ([name, value]) => value === storageConfig?.runtime?.client?.storage?.dataStore,
            )?.[0]
          }
          onValueChange={(value) => {
            if (confirm(t('storage adapter changed alert'))) {
              const storageConfigCopy = JSON.parse(JSON.stringify(storageConfig));
              assignDeep(
                storageConfigCopy,
                ['runtime', 'client', 'storage', 'dataStore'],
                StorageAdapters[value as keyof typeof StorageAdapters],
              );
              queueMicrotask(async () => {
                await SaveConfig(storageConfigCopy);
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
