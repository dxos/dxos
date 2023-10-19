//
// Copyright 2022 DXOS.org
//

import { DownloadSimple, UploadSimple, Gear, Robot, Trash } from '@phosphor-icons/react';
import MobileDetect from 'mobile-detect';
import React, { FC, useMemo } from 'react';
import { FileUploader } from 'react-drag-drop-files';
import { useNavigate } from 'react-router-dom';

import { DropdownMenu } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';
import { Serializer } from '@dxos/echo-schema';
import { useFileDownload } from '@dxos/kai-frames';
import { useClient } from '@dxos/react-client';

import { createPath, defaultFrameId, useAppRouter, useGenerator } from '../../hooks';

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
  const generator = useGenerator(space);
  const serializer = useMemo(() => new Serializer(), []);

  const handleExportSpace = async () => {
    if (!space) {
      return;
    }

    const json = await serializer.export(space.db);
    download(new Blob([JSON.stringify(json, undefined, 2)], { type: 'text/plain' }), 'data.json');
  };

  const handleImportSpace = async (file: File) => {
    const data = new Uint8Array(await file.arrayBuffer());
    const json = new TextDecoder('utf-8').decode(data);
    const space = await client.spaces.create();
    await serializer.import(space.db, JSON.parse(json));
    navigate(createPath({ spaceKey: space.key, frame: defaultFrameId }));
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const handleGenerateData: React.MouseEventHandler = async (e) => {
    let count = 1;

    if (e.shiftKey) {
      count *= 10;
    }
    if (e.altKey) {
      count *= 10;
    }

    for (let i = 0; i < count; i++) {
      await generator?.generate();
    }
  };

  const handleReset = async () => {
    try {
      // TODO(mykola): Client is not re-entrant after reset.
      await client.reset();
    } finally {
      location.reload();
    }
  };

  return (
    <>
      <DropdownMenu.Item onClick={handleSettings}>
        <Gear className={getSize(5)} />
        <span className='mis-2'>Settings</span>
      </DropdownMenu.Item>
      {space && !isMobile && (
        <>
          <DropdownMenu.Item onClick={handleExportSpace}>
            <UploadSimple className={getSize(5)} />
            <span className='mis-2'>Export data</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            <FileUploader classes='flex flex-row flex-1' types={['json']} handleChange={handleImportSpace}>
              <DownloadSimple className={getSize(5)} />
              <span className='mis-2'>Import data</span>
            </FileUploader>
          </DropdownMenu.Item>
        </>
      )}
      <DropdownMenu.Item onClick={handleGenerateData}>
        <Robot className={getSize(5)} />
        <span className='mis-2'>Generate test data</span>
      </DropdownMenu.Item>
      <DropdownMenu.Item onClick={handleReset}>
        <Trash className={getSize(5)} />
        <span className='mis-2'>Reset storage</span>
      </DropdownMenu.Item>
    </>
  );
};
