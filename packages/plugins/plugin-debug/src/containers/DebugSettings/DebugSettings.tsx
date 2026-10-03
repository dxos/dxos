//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { type ConfigInit, SaveConfig, Storage, defs } from '@dxos/config';
import { log } from '@dxos/log';
import { type IdbLogStore, MANUAL_LOG_EXPORT_MAX_BYTES } from '@dxos/log-store-idb';
import { useClient } from '@dxos/react-client';
import { Button, Select, Switch, Toast as UiToast, useFileDownload, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { TRACE_ALL_KEY } from '@dxos/tracing';
import { gzip, setDeep } from '@dxos/util';

import { meta } from '#meta';
import { Settings } from '#types';

import { DebugPortSettings } from '../DebugPortSettings/index.ts';

type Toast = {
  title: string;
  description?: string;
};

const StorageAdapters = {
  opfs: defs.Runtime_Client_Storage_StorageDriver.WEBFS,
  idb: defs.Runtime_Client_Storage_StorageDriver.IDB,
} as const;

export type DebugSettingsProps = AppSurface.SettingsProps<
  Settings.Settings,
  {
    logStore: IdbLogStore;
    onUpload?: AppCapabilities.FileUploader;
  }
>;

export const DebugSettings = ({ settings, onSettingsChange, scope, logStore, onUpload }: DebugSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [toast, setToast] = useState<Toast>();
  const download = useFileDownload();
  const [storageConfig, setStorageConfig] = useState<ConfigInit>({});
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
      const defaultSpace = AppSpace.getDefaultSpace(client);
      if (!defaultSpace) {
        log.error('no default space available for upload');
        return;
      }
      const info = await onUpload(defaultSpace.db, new File([file], fileName));
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
    const file = await gzip(await logStore.exportBlob({ maxSize: MANUAL_LOG_EXPORT_MAX_BYTES }));
    const fileName = `composer-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.ndjson.gz`;
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
          <Form.FieldSet label={meta.profile.name ?? meta.profile.key} actions={scope}>
            <Form.Field label={t('settings.wireframe.label')} description={t('settings.wireframe.description')}>
              <Switch
                disabled={!onSettingsChange}
                checked={settings.wireframe}
                onCheckedChange={({ checked }) => handleWireframeChange(checked)}
              />
            </Form.Field>
            <Form.Field label={t('settings.trace-all.label')} description={t('settings.trace-all.description')}>
              <Switch
                disabled={!onSettingsChange}
                checked={traceAll}
                onCheckedChange={({ checked }) => handleTraceAllChange(checked)}
              />
            </Form.Field>
            <Form.Field
              standalone
              label={t('settings.tracing-panel.label')}
              description={t('settings.tracing-panel.description')}
            >
              <Button
                icon='ph--arrow-square-out--regular'
                iconOnly
                label={t('settings.tracing-panel.label')}
                onClick={handleOpenTracingPanel}
              />
            </Form.Field>
            <Form.Field
              standalone
              label={t('settings.download-diagnostics.label')}
              description={t('settings.download-diagnostics.description')}
            >
              <Button
                icon='ph--download-simple--regular'
                iconOnly
                label={t('settings.download-diagnostics.label')}
                onClick={handleDownload}
              />
            </Form.Field>
            <Form.Field
              standalone
              label={t('settings.download-logs.label')}
              description={t('settings.download-logs.description')}
            >
              <Button
                icon='ph--download-simple--regular'
                iconOnly
                label={t('settings.download-logs.label')}
                onClick={handleDownloadLogs}
              />
            </Form.Field>
            <Form.Field standalone label={t('settings.repair.label')} description={t('settings.repair.description')}>
              <Button
                icon='ph--first-aid-kit--regular'
                iconOnly
                label={t('settings.repair.label')}
                onClick={handleRepair}
              />
            </Form.Field>

            {/* TODO(burdon): Move to layout? */}
            {toast && (
              <UiToast.Root defaultOpen duration={5_000} onOpenChange={(open) => !open && setToast(undefined)}>
                <UiToast.Header icon='ph--gift--duotone'>{toast.title}</UiToast.Header>
                {toast.description && <UiToast.Description>{toast.description}</UiToast.Description>}
              </UiToast.Root>
            )}

            <Form.Field
              label={t('settings.choose-storage-adaptor.label')}
              description={t('settings.choose-storage-adaptor.description')}
            >
              <Select.Root
                disabled={!onSettingsChange}
                value={Object.entries(StorageAdapters)
                  .filter(([_name, value]) => value === storageConfig?.runtime?.client?.storage?.dataStore)
                  .map(([name]) => name)
                  .slice(0, 1)}
                onValueChange={({ value: [value] }) => value && handleStorageAdapterChange(value)}
                items={Object.keys(StorageAdapters).map((key) => ({
                  value: key,
                  label: t(`settings.storage-adaptor.${key}.label`),
                }))}
              >
                <Select.Trigger disabled={!onSettingsChange} placeholder={t('settings.data-store.label')} />
                <Select.Content>
                  {Object.keys(StorageAdapters).map((key) => (
                    <Select.Item key={key} item={{ value: key, label: t(`settings.storage-adaptor.${key}.label`) }} />
                  ))}
                </Select.Content>
              </Select.Root>
            </Form.Field>
          </Form.FieldSet>

          <DebugPortSettings disabled={!onSettingsChange} />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

const updateConfig = (config: ConfigInit, setConfig: (newConfig: ConfigInit) => void, path: string[], value: any) => {
  const storageConfigCopy = JSON.parse(JSON.stringify(config ?? {}));
  setDeep(storageConfigCopy, path, value);
  setConfig(storageConfigCopy);
  queueMicrotask(async () => {
    await SaveConfig(storageConfigCopy);
  });
};

DebugSettings.displayName = 'DebugSettings';
