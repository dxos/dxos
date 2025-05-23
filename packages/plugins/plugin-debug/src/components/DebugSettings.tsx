//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Capabilities, useCapabilities } from '@dxos/app-framework';
import { type ConfigProto, defs, SaveConfig, Storage } from '@dxos/config';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { useTranslation, Button, Toast, Input, useFileDownload, Select, Icon } from '@dxos/react-ui';
import { DeprecatedFormContainer, DeprecatedFormInput } from '@dxos/react-ui-form';
import { setDeep } from '@dxos/util';

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
  const [upload] = useCapabilities(Capabilities.FileUploader);

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

    if (upload) {
      const info = await upload(new File([file], fileName), client.spaces.default);
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
    <DeprecatedFormContainer>
      <DeprecatedFormInput label={t('settings wireframe')}>
        <Input.Switch checked={settings.wireframe} onCheckedChange={(checked) => (settings.wireframe = !!checked)} />
      </DeprecatedFormInput>
      <DeprecatedFormInput label={t('settings download diagnostics')}>
        <Button onClick={handleDownload}>
          <Icon icon='ph--download-simple--regular' size={5} />
        </Button>
      </DeprecatedFormInput>
      <DeprecatedFormInput label={t('settings repair')}>
        <Button onClick={handleRepair}>
          <Icon icon='ph--first-aid-kit--regular' size={5} />
        </Button>
      </DeprecatedFormInput>

      {/* TODO(burdon): Move to layout? */}
      {toast && (
        <Toast.Root>
          <Toast.Body>
            <Toast.Title>
              <Icon icon='ph--gift--duotone' size={5} classNames='inline mr-1' />
              <span>{toast.title}</span>
            </Toast.Title>
            {toast.description && <Toast.Description>{toast.description}</Toast.Description>}
          </Toast.Body>
        </Toast.Root>
      )}

      <DeprecatedFormInput label={t('settings choose storage adaptor')}>
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
      </DeprecatedFormInput>
    </DeprecatedFormContainer>
  );
};

const updateConfig = (config: ConfigProto, setConfig: (newConfig: ConfigProto) => void, path: string[], value: any) => {
  const storageConfigCopy = JSON.parse(JSON.stringify(config ?? {}));
  setDeep(storageConfigCopy, path, value);
  setConfig(storageConfigCopy);
  queueMicrotask(async () => {
    await SaveConfig(storageConfigCopy);
  });
};
