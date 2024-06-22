//
// Copyright 2023 DXOS.org
//

import { Gift, DownloadSimple, FirstAidKit } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { SettingsValue } from '@braneframe/plugin-settings';
import { parseFileManagerPlugin, useResolvePlugin } from '@dxos/app-framework';
import { type ConfigProto, defs, SaveConfig, Storage } from '@dxos/config';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { useTranslation, Button, Toast, Input, useFileDownload, Select } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { assignDeep } from '@dxos/util';

import { DEBUG_PLUGIN } from '../meta';
import { type DebugSettingsProps } from '../types';

type Toast = {
  title: string;
  description?: string;
};

const StorageAdapters = {
  opfs: defs.Runtime.Client.Storage.StorageDriver.WEBFS,
  idb: defs.Runtime.Client.Storage.StorageDriver.IDB,
} as const;

export const DebugSettings = ({ settings }: { settings: DebugSettingsProps }) => {
  const { t } = useTranslation(DEBUG_PLUGIN);
  const [toast, setToast] = useState<Toast>();
  const client = useClient();
  const download = useFileDownload();
  // TODO(mykola): Get updates from other places that change Config.
  const [storageConfig, setStorageConfig] = useState<ConfigProto>({});
  const fileManagerPlugin = useResolvePlugin(parseFileManagerPlugin);

  useEffect(() => {
    void Storage().then((config) => setStorageConfig(config));
  }, []);

  const handleToast = (toast: Toast) => {
    setToast(toast);
    const t = setTimeout(() => setToast(undefined), 5_000);
    return () => clearTimeout(t);
  };

  const handleDownload = async () => {
    const data = await client.diagnostics();
    const file = new Blob([JSON.stringify(data, undefined, 2)], { type: 'text/plain' });
    const fileName = `composer-${new Date().toISOString().replace(/\W/g, '-')}.json`;
    download(file, fileName);

    if (fileManagerPlugin?.provides.file.upload) {
      const info = await fileManagerPlugin.provides.file.upload(new File([file], fileName), client.spaces.default);
      if (!info) {
        log.error('diagnostics failed to upload to IPFS');
        return;
      }
      handleToast({ title: t('settings uploaded'), description: t('settings uploaded to clipboard') });

      // TODO(nf): move to IpfsPlugin?
      const url = client.config.values.runtime!.services!.ipfs!.gateway + '/' + info.cid;
      void navigator.clipboard.writeText(url);
      handleToast({ title: t('settings uploaded'), description: t('settings uploaded to clipboard') });
      log.info('diagnostics', { url });
    }
  };

  const handleRepair = async () => {
    try {
      const info = await client.repair();
      setStorageConfig(await Storage());
      handleToast({ title: t('settings repair success'), description: JSON.stringify(info, undefined, 2) });
    } catch (err: any) {
      handleToast({ title: t('settings repair failed'), description: err.message });
    }
  };

  return (
    <>
      <SettingsValue label={t('settings show debug panel')}>
        <Input.Switch checked={settings.debug} onCheckedChange={(checked) => (settings.debug = !!checked)} />
      </SettingsValue>
      <SettingsValue label={t('settings show devtools panel')}>
        <Input.Switch checked={settings.devtools} onCheckedChange={(checked) => (settings.devtools = !!checked)} />
      </SettingsValue>
      <SettingsValue label={t('settings download diagnostics')}>
        <Button onClick={handleDownload}>
          <DownloadSimple className={getSize(5)} />
        </Button>
      </SettingsValue>
      <SettingsValue label={t('settings repair')}>
        <Button onClick={handleRepair}>
          <FirstAidKit className={getSize(5)} />
        </Button>
      </SettingsValue>

      {/* TODO(burdon): Move to layout? */}
      {toast && (
        <Toast.Root>
          <Toast.Body>
            <Toast.Title>
              <Gift className={mx(getSize(5), 'inline mr-1')} weight='duotone' />
              <span>{toast.title}</span>
            </Toast.Title>
            {toast.description && <Toast.Description>{toast.description}</Toast.Description>}
          </Toast.Body>
        </Toast.Root>
      )}

      <SettingsValue label={t('settings choose storage adaptor')}>
        <Select.Root
          value={
            Object.entries(StorageAdapters).find(
              ([name, value]) => value === storageConfig?.runtime?.client?.storage?.dataStore,
            )?.[0]
          }
          onValueChange={(value) => {
            if (confirm(t('settings storage adapter changed alert'))) {
              updateConfig(
                storageConfig,
                setStorageConfig,
                ['runtime', 'client', 'storage', 'dataStore'],
                StorageAdapters[value as keyof typeof StorageAdapters],
              );
            }
          }}
        >
          <Select.TriggerButton placeholder={t('settings data store label')} />
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

const updateConfig = (config: ConfigProto, setConfig: (newConfig: ConfigProto) => void, path: string[], value: any) => {
  const storageConfigCopy = JSON.parse(JSON.stringify(config ?? {}));
  assignDeep(storageConfigCopy, path, value);
  setConfig(storageConfigCopy);
  queueMicrotask(async () => {
    await SaveConfig(storageConfigCopy);
  });
};
