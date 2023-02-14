//
// Copyright 2022 DXOS.org
//

import MobileDetect from 'mobile-detect';
import { DownloadSimple, UploadSimple, Gear, Robot, Trash, WifiHigh, WifiSlash } from 'phosphor-react';
import React, { FC, useMemo } from 'react';
import { FileUploader } from 'react-drag-drop-files';
import { useNavigate } from 'react-router-dom';

import { Serializer } from '@dxos/echo-schema';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { useClient, useNetworkStatus } from '@dxos/react-client';
import { Button, getSize, mx } from '@dxos/react-components';

import { useFileDownload, useGenerator, useSpace, createSpacePath } from '../../hooks';

// TODO(burdon): Factor out.
export const isMobile = new MobileDetect(window.navigator.userAgent).mobile();

export type Action = {
  Icon: FC<any>;
  title: string;
  handler?: () => void;
};

// TODO(burdon): Move to Menu.
export const Actions = () => {
  const navigate = useNavigate();
  const client = useClient();
  const download = useFileDownload();
  const space = useSpace();
  const { state: connectionState } = useNetworkStatus();
  const generator = useGenerator();
  const serializer = useMemo(() => new Serializer(), []);

  const handleExportSpace = async () => {
    const json = await serializer.export(space.experimental.db);
    download(new Blob([JSON.stringify(json, undefined, 2)], { type: 'text/plain' }), 'data.json');
  };

  const handleImportSpace = async (files: File) => {
    const data = new Uint8Array(await files.arrayBuffer());
    const json = new TextDecoder('utf-8').decode(data);
    const space = await client.echo.createSpace();
    await serializer.import(space.experimental.db, JSON.parse(json));
    navigate(createSpacePath(space.key));
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const handleGenerateData = async () => {
    await generator?.generate();
  };

  const handleReset = async () => {
    try {
      // TODO(mykola): Client is not re-entrant after reset.
      await client.reset();
    } finally {
      location.reload();
    }
  };

  const handleToggleConnection = async () => {
    switch (connectionState) {
      case ConnectionState.OFFLINE: {
        await client.mesh.setConnectionState(ConnectionState.ONLINE);
        break;
      }
      case ConnectionState.ONLINE: {
        await client.mesh.setConnectionState(ConnectionState.OFFLINE);
        break;
      }
    }
  };

  const actions: Action[] = [
    {
      Icon: Gear,
      title: 'Settings',
      handler: () => handleSettings()
    },
    !isMobile && [
      {
        Icon: DownloadSimple,
        title: 'Export data',
        handler: () => handleExportSpace()
      },
      {
        Icon: () => (
          <FileUploader types={['json']} handleChange={handleImportSpace}>
            <UploadSimple className={mx(getSize(6), 'cursor-pointer')} />
          </FileUploader>
        ),
        title: 'Import data'
      }
    ],
    {
      Icon: Robot,
      title: 'Generate test data',
      handler: () => handleGenerateData()
    },
    {
      Icon: Trash,
      title: 'Reset storage',
      handler: () => handleReset()
    },
    {
      Icon: () =>
        connectionState === ConnectionState.ONLINE ? (
          <WifiHigh className={getSize(6)} />
        ) : (
          <WifiSlash className={mx(getSize(6), 'text-selection-text')} />
        ),
      title: 'Toggle connection',
      handler: () => handleToggleConnection()
    }
  ]
    .filter(Boolean)
    .flat() as Action[];

  return (
    <div className='flex shrink-0 p-2 px-4'>
      {actions.map((action, i) => {
        const { Icon, handler, title } = action;
        return (
          <Button compact key={i} className='mr-1' onClick={handler} title={title}>
            <Icon className={getSize(6)} />
          </Button>
        );
      })}
    </div>
  );
};
