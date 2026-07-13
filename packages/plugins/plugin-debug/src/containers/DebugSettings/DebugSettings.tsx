//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { AppCapabilities, AppSpace } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type ConfigProto, SaveConfig, Storage, defs } from '@dxos/config';
import { log } from '@dxos/log';
import { type IdbLogStore } from '@dxos/log-store-idb';
import { useClient } from '@dxos/react-client';
import { IconButton, Input, Select, Toast, useFileDownload, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { TRACE_ALL_KEY } from '@dxos/tracing';
import { setDeep } from '@dxos/util';

import { meta } from '#meta';
import { Settings } from '#types';

type Toast = {
  title: string;
  description?: string;
};

const StorageAdapters = {
  opfs: defs.Runtime.Client.Storage.StorageDriver.WEBFS,
  idb: defs.Runtime.Client.Storage.StorageDriver.IDB,
} as const;

export type DebugSettingsProps = AppSurface.SettingsProps<
  Settings.Settings,
  {
    logStore: IdbLogStore;
    onUpload?: AppCapabilities.FileUploader;
  }
>;

export const DebugSettings = ({ settings, onSettingsChange, logStore, onUpload }: DebugSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
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
      const personalSpace = AppSpace.getPersonalSpace(client);
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
        title: t('settings.uploaded.message'),
        description: t('settings.uploaded.description'),
      });

      // TODO(nf): move to IpfsPlugin?
      const url = client.config.values.runtime!.services!.ipfs!.gateway + '/' + info.cid;
      void navigator.clipboard.writeText(url);
      handleToast({
        title: t('settings.uploaded.message'),
        description: t('settings.uploaded.description'),
      });
      log.info('diagnostics', { url });
    }
  }, [client, download, handleToast, onUpload, t]);

  const handleDownloadLogs = useCallback(async () => {
    const ndjson = await logStore.export();
    const file = new Blob([ndjson], { type: 'application/x-ndjson' });
    const fileName = `composer-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.ndjson`;
    download(file, fileName);
  }, [download, logStore]);

  const handleRepair = useCallback(async () => {
    try {
      const info = await client.repair();
      setStorageConfig(await Storage());
      handleToast({
        title: t('settings.repair-success.message'),
        description: JSON.stringify(info, undefined, 2),
      });
    } catch (err: any) {
      handleToast({
        title: t('settings.repair-failed.message'),
        description: err.message,
      });
    }
  }, [client, handleToast, t]);

  const handleWireframeChange = useCallback(
    (checked: boolean) => onSettingsChange?.((s) => ({ ...s, wireframe: !!checked })),
    [onSettingsChange],
  );

  const traceAll = useMemo(
    () => settings.traceAll ?? (typeof localStorage !== 'undefined' && localStorage.getItem(TRACE_ALL_KEY) === 'true'),
    [settings.traceAll],
  );

  const handleTraceAllChange = useCallback(
    (checked: boolean) => {
      const value = !!checked;
      localStorage.setItem(TRACE_ALL_KEY, String(value));
      onSettingsChange?.((s) => ({ ...s, traceAll: value }));
    },
    [onSettingsChange],
  );

  const handleOpenTracingPanel = useCallback(() => {
    window.open('about:blank', '_blank');
  }, []);

  const handleStorageAdapterChange = useCallback(
    (value: string) => {
      if (confirm(t('settings.storage-adapter.changed-alert.message'))) {
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
    <Form.Root schema={Settings.Settings} values={settings} variant='settings' readonly={!onSettingsChange}>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={meta.profile.name ?? meta.profile.key}>
            <Form.Row label={t('settings.wireframe.label')} description={t('settings.wireframe.description')}>
              <Input.Root>
                <Input.Switch
                  disabled={!onSettingsChange}
                  checked={settings.wireframe}
                  onCheckedChange={handleWireframeChange}
                />
              </Input.Root>
            </Form.Row>
            <Form.Row label={t('settings.trace-all.label')} description={t('settings.trace-all.description')}>
              <Input.Root>
                <Input.Switch disabled={!onSettingsChange} checked={traceAll} onCheckedChange={handleTraceAllChange} />
              </Input.Root>
            </Form.Row>
            <Form.Row label={t('settings.tracing-panel.label')} description={t('settings.tracing-panel.description')}>
              <IconButton
                icon='ph--arrow-square-out--regular'
                iconOnly
                label={t('settings.tracing-panel.label')}
                onClick={handleOpenTracingPanel}
              />
            </Form.Row>
            <Form.Row
              label={t('settings.download-diagnostics.label')}
              description={t('settings.download-diagnostics.description')}
            >
              <IconButton
                icon='ph--download-simple--regular'
                iconOnly
                label={t('settings.download-diagnostics.label')}
                onClick={handleDownload}
              />
            </Form.Row>
            <Form.Row label={t('settings.download-logs.label')} description={t('settings.download-logs.description')}>
              <IconButton
                icon='ph--download-simple--regular'
                iconOnly
                label={t('settings.download-logs.label')}
                onClick={handleDownloadLogs}
              />
            </Form.Row>
            <Form.Row label={t('settings.repair.label')} description={t('settings.repair.description')}>
              <IconButton
                icon='ph--first-aid-kit--regular'
                iconOnly
                label={t('settings.repair.label')}
                onClick={handleRepair}
              />
            </Form.Row>

            {/* TODO(burdon): Move to layout? */}
            {toast && (
              <Toast.Root>
                <Toast.Title icon='ph--gift--duotone'>
                  <span>{toast.title}</span>
                </Toast.Title>
                {toast.description && <Toast.Description>{toast.description}</Toast.Description>}
              </Toast.Root>
            )}

            <Form.Row
              label={t('settings.choose-storage-adaptor.label')}
              description={t('settings.choose-storage-adaptor.description')}
            >
              <Select.Root
                disabled={!onSettingsChange}
                value={
                  Object.entries(StorageAdapters).find(
                    ([_name, value]) => value === storageConfig?.runtime?.client?.storage?.dataStore,
                  )?.[0]
                }
                onValueChange={handleStorageAdapterChange}
              >
                <Select.TriggerButton disabled={!onSettingsChange} placeholder={t('settings.data-store.label')} />
                <Select.Portal>
                  <Select.Content>
                    <Select.Viewport>
                      {Object.keys(StorageAdapters).map((key) => (
                        <Select.Option key={key} value={key}>
                          {t(`settings.storage-adaptor.${key}.label`)}
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

const updateConfig = (config: ConfigProto, setConfig: (newConfig: ConfigProto) => void, path: string[], value: any) => {
  const storageConfigCopy = JSON.parse(JSON.stringify(config ?? {}));
  setDeep(storageConfigCopy, path, value);
  setConfig(storageConfigCopy);
  queueMicrotask(async () => {
    await SaveConfig(storageConfigCopy);
  });
};

DebugSettings.displayName = 'DebugSettings';
