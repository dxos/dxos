//
// Copyright 2023 DXOS.org
//

import { Gift, DownloadSimple, FirstAidKit } from '@phosphor-icons/react';
import { create } from 'ipfs-http-client';
import React, { useState } from 'react';

import { SettingsValue } from '@braneframe/plugin-settings';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { useTranslation, Button, Toast, Input, useFileDownload } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { DEBUG_PLUGIN } from '../meta';
import { type DebugSettingsProps } from '../types';

type Toast = {
  title: string;
  description?: string;
};

export const DebugSettings = ({ settings }: { settings: DebugSettingsProps }) => {
  const { t } = useTranslation(DEBUG_PLUGIN);
  const [toast, setToast] = useState<Toast>();
  const client = useClient();
  const download = useFileDownload();

  const handleToast = (toast: Toast) => {
    setToast(toast);
    const t = setTimeout(() => setToast(undefined), 5_000);
    return () => clearTimeout(t);
  };

  const handleDownload = async () => {
    const data = await client.diagnostics();
    const file = new Blob([JSON.stringify(data, undefined, 2)], { type: 'text/plain' });
    download(file, `composer-${new Date().toISOString().replace(/\W/g, '-')}.json`);

    const server = client.config.values.runtime?.services?.ipfs?.server;
    if (server) {
      const ipfsClient = create({ url: server });
      const info = await ipfsClient?.add(file);
      const url = client.config.values.runtime!.services!.ipfs!.gateway + '/' + info.cid;
      void navigator.clipboard.writeText(url);
      handleToast({ title: t('settings uploaded'), description: t('settings uploaded to clipboard') });
      log.info('diagnostics', { url });
    }
  };

  const handleRepair = async () => {
    try {
      const info = await client.repair();
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
    </>
  );
};
