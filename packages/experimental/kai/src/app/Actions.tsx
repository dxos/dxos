//
// Copyright 2022 DXOS.org
//

import { DownloadSimple, UploadSimple, Gear, Robot, Trash, WifiHigh, WifiSlash } from 'phosphor-react';
import React, { FC, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Serializer } from '@dxos/echo-schema';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { useClient, useNetworkStatus } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

import { createSpacePath } from '../Routes';
import { FileUploadDialog } from '../components';
import { useFileDownload, useSpace } from '../hooks';
import { Generator } from '../proto';

export type Action = {
  Icon: FC<any>; // TODO(burdon): Type.
  title: string;
  handler: () => void;
};

export const Actions = () => {
  const navigate = useNavigate();
  const client = useClient();
  const download = useFileDownload();
  const { space } = useSpace();
  const { state: connectionState } = useNetworkStatus();
  const generator = useMemo(() => (space ? new Generator(space.experimental.db) : undefined), [space]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const serializer = useMemo(() => new Serializer(), []);

  const handleExportSpace = async () => {
    const json = await serializer.export(space.experimental.db);
    download(new Blob([JSON.stringify(json, undefined, 2)], { type: 'text/plain' }), 'data.json');
  };

  const handleImportSpace = async (files: File[]) => {
    if (files.length) {
      const data = new Uint8Array(await files[0].arrayBuffer());
      const json = new TextDecoder('utf-8').decode(data);
      const space = await client.echo.createSpace();
      await serializer.import(space.experimental.db, JSON.parse(json));
      navigate(createSpacePath(space.key));
    }
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const handleGenerateData = async () => {
    await generator?.generate();
  };

  const handleReset = async () => {
    await client.reset();
    await client.initialize();

    // TODO(burdon): Hangs (no error) if profile not created?
    if (!client.halo.profile) {
      await client.halo.createProfile();
    }

    location.reload(); // TODO(mykola): Client is not re-entrant after reset.
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
    {
      Icon: DownloadSimple,
      title: 'Export data',
      handler: () => handleExportSpace()
    },
    {
      Icon: UploadSimple,
      title: 'Import data',
      handler: () => setUploadDialogOpen(true)
    },
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
      Icon: () => {
        return connectionState === ConnectionState.ONLINE ? (
          <WifiHigh className={getSize(6)} />
        ) : (
          <WifiSlash className={mx(getSize(6), 'text-orange-500')} />
        );
      },
      title: 'Toggle connection',
      handler: () => handleToggleConnection()
    }
  ];

  return (
    <>
      <FileUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onUpload={handleImportSpace}
      />

      <div className='flex flex-shrink-0 p-3 mt-2'>
        {actions.map((action, i) => {
          const { Icon, handler, title } = action;
          return (
            <button key={i} className='mr-1' onClick={handler} title={title}>
              <Icon className={getSize(6)} />
            </button>
          );
        })}
      </div>
    </>
  );
};
