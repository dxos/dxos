//
// Copyright 2023 DXOS.org
//

import { DownloadSimple } from '@phosphor-icons/react';
import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import urlJoin from 'url-join';

import { File } from '@dxos/kai-types';
import { log } from '@dxos/log';
import { useConfig, useQuery } from '@dxos/react-client';
import { useMediaQuery } from '@dxos/react-components';

import { FrameObjectList } from '../../containers';
import { createPath, useFileDownload, useAppRouter, useIpfsClient } from '../../hooks';
import { FileUpload } from './FileUpload';
import { FileFrameRuntime, defaultFileTypes } from './defs';

export type FileListProps = {
  disableDownload?: boolean;
  fileTypes?: string[];
  onSelect?: (objectId: string | undefined) => void;
};

// TODO(burdon): Rename.
export const FilePlugin: FC<FileListProps> = ({ disableDownload, fileTypes = defaultFileTypes, onSelect }) => {
  const config = useConfig();
  const ipfsClient = useIpfsClient();
  const download = useFileDownload();
  const navigate = useNavigate();
  const [isMd] = useMediaQuery('md', { ssr: false });
  const { space, frame } = useAppRouter();
  const objects = useQuery(space, File.filter());
  if (!space || !frame) {
    return null;
  }

  const handleSelect = (objectId: string) => {
    if (onSelect) {
      onSelect(objectId);
    } else {
      navigate(createPath({ spaceKey: space.key, frame: frame?.module.id, objectId }));
    }
  };

  // https://www.npmjs.com/package/react-drag-drop-files
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file
  // https://developer.mozilla.org/en-US/docs/Web/API/File
  // TODO(burdon): Handle multiple files.
  const handleUpload = async (uploadedFile: any) => {
    log('uploading...', { filename: uploadedFile.name });
    const { cid, path, size } = await ipfsClient.add(uploadedFile);
    log('uploaded', { cid: path, size });
    await ipfsClient.pin.add(cid); // TODO(burdon): Option.
    const file = new File({ name: uploadedFile.name, cid: path });
    await space.db.add(file);
    handleSelect(file.id);
  };

  // TODO(burdon): Factor out (ipfs hook/wrapper).
  const handleDownload = async (objectId: string) => {
    const object = objects.find((object) => object.id === objectId);
    if (object?.cid) {
      const url = urlJoin(config.values.runtime!.services!.ipfs!.gateway!, object.cid);
      const response = await fetch(url);
      const blob = await response.blob();
      download(blob, object.name);
    }
  };

  return (
    <div className='flex flex-col w-full'>
      <FrameObjectList
        frameDef={FileFrameRuntime}
        Action={DownloadSimple}
        onSelect={onSelect}
        onAction={disableDownload ? undefined : handleDownload}
      />

      {isMd && (
        <div className='px-2'>
          <FileUpload fileTypes={fileTypes} onUpload={handleUpload} />
        </div>
      )}
    </div>
  );
};

export default FilePlugin;
