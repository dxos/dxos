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
import { DropdownMenuItem, getSize, mx } from '@dxos/react-components';

import { createPath, defaultFrameId, useAppRouter, useFileDownload, useGenerator } from '../../hooks';

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
  const { space } = useAppRouter();
  const { state: connectionState } = useNetworkStatus();
  const generator = useGenerator();
  const serializer = useMemo(() => new Serializer(), []);

  const handleExportSpace = async () => {
    if (!space) {
      return;
    }

    const json = await serializer.export(space.db);
    download(new Blob([JSON.stringify(json, undefined, 2)], { type: 'text/plain' }), 'data.json');
  };

  const handleImportSpace = async (files: File) => {
    const data = new Uint8Array(await files.arrayBuffer());
    const json = new TextDecoder('utf-8').decode(data);
    const space = await client.echo.createSpace();
    await serializer.import(space.db, JSON.parse(json));
    navigate(createPath({ spaceKey: space.key, frame: defaultFrameId }));
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

  return (
    <>
      <DropdownMenuItem onClick={handleSettings}>
        <Gear className={getSize(5)} />
        <span className='mis-2'>Settings</span>
      </DropdownMenuItem>
      {space && !isMobile && (
        <>
          <DropdownMenuItem onClick={handleExportSpace}>
            <DownloadSimple className={getSize(5)} />
            <span className='mis-2'>Export data</span>
          </DropdownMenuItem>
          <FileUploader types={['json']} handleChange={handleImportSpace}>
            <DropdownMenuItem>
              <UploadSimple className={getSize(5)} />
              <span className='mis-2'>Import data</span>
            </DropdownMenuItem>
          </FileUploader>
        </>
      )}
      <DropdownMenuItem onClick={handleGenerateData}>
        <Robot className={getSize(5)} />
        <span className='mis-2'>Generate test data</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleReset}>
        <Trash className={getSize(5)} />
        <span className='mis-2'>Reset storage</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleToggleConnection}>
        {connectionState === ConnectionState.ONLINE ? (
          <WifiHigh className={getSize(5)} />
        ) : (
          <WifiSlash className={mx(getSize(5), 'text-selection-text')} />
        )}
        <span className='mis-2'>Toggle connection</span>
      </DropdownMenuItem>
    </>
  );
};
