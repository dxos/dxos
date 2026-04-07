//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { AppCapabilities, getPersonalSpace } from '@dxos/app-toolkit';
import { type SettingsSurfaceProps } from '@dxos/app-toolkit/ui';
import { type ConfigProto, SaveConfig, Storage, defs } from '@dxos/config';
import { type LogBuffer, log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { Icon, IconButton, Input, Select, Toast, useFileDownload, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';
import { setDeep } from '@dxos/util';

import { meta } from '../../meta';
import { type Settings } from '../../types';

type Toast = {
  title: string;
  description?: string;
};

const StorageAdapters = {
  opfs: defs.Runtime.Client.Storage.StorageDriver.WEBFS,
  idb: defs.Runtime.Client.Storage.StorageDriver.IDB,
} as const;

export type DebugSettingsProps = SettingsSurfaceProps<
  Settings.Settings,
  {
    logBuffer: LogBuffer;
    onUpload?: AppCapabilities.FileUploader;
  }
>;

export const DebugSettings = ({ settings, onSettingsChange, logBuffer, onUpload }: DebugSettingsProps) => {
  const { t } = useTranslation(meta.id);
  const [toast, setToast] = useState<Toast>();
  const download = useFileDownload();
  const [storageConfig, setStorageConfig] = useState<ConfigProto>({});
  const client = useClient();

  useEffect(() => {
    void Storage().then((config) => setStorageConfig(config));
  }, []);

  const handleToast = useCallback(
    (toast: Toast) => {
      setToast(toast);
      const timer = setTimeout(() => setToast(undefined), 5_000);
      return () => clearTimeout(timer);
    },
    [setToast],
  );

  const handleDownload = useCallback(async () => {
    const data = await client.diagnostics();
    const file = new Blob([JSON.stringify(data, undefined, 2)], {
      type: 'text/plain',
    });
    const fileName = `composer-${new Date().toISOString().replace(/\W/g, '-')}.json`;
    download(file, fileName);

    if (onUpload) {
      const personalSpace = getPersonalSpace(client);
      if (!personalSpace) {
        log.error('no personal space available for upload');
        return;
      }
      const info = await onUpload(personalSpace.db, new File([file], fileName));
      if (!info) {
        log.error('diagnostics failed to upload to IPFS');
        return;
      }
      handleToast({
        title: t('settings-uploaded.message'),
        description: t('settings-uploaded.description'),
      });

      // TODO(nf): move to IpfsPlugin?
      const url = client.config.values.runtime!.services!.ipfs!.gateway + '/' + info.cid;
      void navigator.clipboard.writeText(url);
      handleToast({
        title: t('settings-uploaded.message'),
        description: t('settings-uploaded.description'),
      });
      log.info('diagnostics', { url });
    }
  }, [client, download, handleToast, onUpload, t]);

  const handleDownloadLogs = useCallback(() => {
    const ndjson = logBuffer.serialize();
    const file = new Blob([ndjson], { type: 'application/x-ndjson' });
    const fileName = `composer-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.ndjson`;
    download(file, fileName);
  }, [download, logBuffer]);

  const handleRepair = useCallback(async () => {
    try {
      const info = await client.repair();
      setStorageConfig(await Storage());
      handleToast({
        title: t('settings-repair-success.message'),
        description: JSON.stringify(info, undefined, 2),
      });
    } catch (err: any) {
      handleToast({
        title: t('settings-repair-failed.message'),
        description: err.message,
      });
    }
  }, [client, handleToast, t]);

  const handleWireframeChange = useCallback(
    (checked: boolean) => onSettingsChange?.((s) => ({ ...s, wireframe: !!checked })),
    [onSettingsChange],
  );

  const handleStorageAdapterChange = useCallback(
    (value: string) => {
      if (confirm(t('settings-storage-adapter.changed-alert.message'))) {
        updateConfig(
          storageConfig,
          setStorageConfig,
          ['runtime', 'client', 'storage', 'dataStore'],
          StorageAdapters[value as keyof typeof StorageAdapters],
        );
      }
    },
    [storageConfig, t],
  );

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <SettingsForm.Item title={t('settings-wireframe.label')}>
          <Input.Switch
            disabled={!onSettingsChange}
            checked={settings.wireframe}
            onCheckedChange={handleWireframeChange}
          />
        </SettingsForm.Item>
        <SettingsForm.Item title={t('settings-download-diagnostics.label')}>
          <IconButton
            icon='ph--download-simple--regular'
            iconOnly
            disabled={!onUpload}
            label={t('settings-download-diagnostics.label')}
            onClick={handleDownload}
          />
        </SettingsForm.Item>
        <SettingsForm.Item title={t('settings-download-logs.label')}>
          <IconButton
            icon='ph--download-simple--regular'
            iconOnly
            label={t('settings-download-logs.label')}
            onClick={handleDownloadLogs}
          />
        </SettingsForm.Item>
        <SettingsForm.Item title={t('settings-repair.label')}>
          <IconButton
            icon='ph--first-aid-kit--regular'
            iconOnly
            label={t('settings-repair.label')}
            onClick={handleRepair}
          />
        </SettingsForm.Item>

        {/* TODO(burdon): Move to layout? */}
        {toast && (
          <Toast.Root>
            <Toast.Body>
              <Toast.Title>
                <Icon icon='ph--gift--duotone' classNames='inline mr-1' />
                <span>{toast.title}</span>
              </Toast.Title>
              {toast.description && <Toast.Description>{toast.description}</Toast.Description>}
            </Toast.Body>
          </Toast.Root>
        )}

        <SettingsForm.Item title={t('settings-choose-storage-adaptor.label')}>
          <Select.Root
            disabled={!onSettingsChange}
            value={
              Object.entries(StorageAdapters).find(
                ([_name, value]) => value === storageConfig?.runtime?.client?.storage?.dataStore,
              )?.[0]
            }
            onValueChange={handleStorageAdapterChange}
          >
            <Select.TriggerButton disabled={!onSettingsChange} placeholder={t('settings-data-store.label')} />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {Object.keys(StorageAdapters).map((key) => (
                    <Select.Option key={key} value={key}>
                      {t(`settings-storage-adaptor.${key}.label`)}
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

const updateConfig = (config: ConfigProto, setConfig: (newConfig: ConfigProto) => void, path: string[], value: any) => {
  const storageConfigCopy = JSON.parse(JSON.stringify(config ?? {}));
  setDeep(storageConfigCopy, path, value);
  setConfig(storageConfigCopy);
  queueMicrotask(async () => {
    await SaveConfig(storageConfigCopy);
  });
};
