//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import urlJoin from 'url-join';

import { File } from '@dxos/kai-types';
import { log } from '@dxos/log';
import { useConfig, useQuery } from '@dxos/react-client';
import { useMediaQuery } from '@dxos/react-components';

import { createPath, useFileDownload, useAppRouter, useIpfsClient } from '../../hooks';
import { FileUpload } from './FileUpload';

export type FileListProps = {
  disableDownload?: boolean;
  onSelect?: (objectId: string) => void;
};

// TODO(burdon): Rename.
export const FilePlugin: FC<FileListProps> = ({ disableDownload, onSelect }) => {
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

  return <div className='flex flex-col w-full'>{isMd && <FileUpload onUpload={handleUpload} />}</div>;
};

export default FilePlugin;
