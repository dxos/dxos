//
// Copyright 2023 DXOS.org
//

import { DownloadSimple, FilePlus } from 'phosphor-react';
import React, { FC } from 'react';
import { FileUploader } from 'react-drag-drop-files';
import { useNavigate } from 'react-router-dom';
import urlJoin from 'url-join';

import { File } from '@dxos/kai-types';
import { log } from '@dxos/log';
import { useConfig, useQuery } from '@dxos/react-client';
import { getSize, useMediaQuery } from '@dxos/react-components';

import { ObjectList } from '../../components';
import { createPath, useFileDownload, useAppRouter, useIpfsClient } from '../../hooks';
import { fileTypes } from './defs';

export type FileListProps = {
  disableDownload?: boolean;
  onSelect?: (objectId: string) => void;
};

// TODO(burdon): Separate Tile from component.
// TODO(burdon): Download optional.
export const FileList: FC<FileListProps> = ({ disableDownload, onSelect }) => {
  const config = useConfig();
  const ipfsClient = useIpfsClient();
  const download = useFileDownload();
  const navigate = useNavigate();
  const [isMd] = useMediaQuery('md', { ssr: false });
  const { space, frame, objectId } = useAppRouter();
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
      <ObjectList<File>
        frame={frame}
        objects={objects}
        selected={objectId}
        getTitle={(object) => object.name}
        setTitle={(object, title) => (object.name = title)}
        Action={DownloadSimple}
        onSelect={handleSelect}
        onAction={disableDownload ? undefined : handleDownload}
      />

      {isMd && (
        <div className='m-2'>
          <FileUpload onUpload={handleUpload} />
        </div>
      )}
    </div>
  );
};

const FileUpload: FC<{ onUpload: (file: File) => void }> = ({ onUpload }) => {
  return (
    <div className='hidden md:flex shrink-0 flex-col w-full h-[200px] p-2'>
      <FileUploader
        name='file'
        types={fileTypes}
        hoverTitle={' '}
        classes='flex flex-1 flex-col justify-center w-full h-full border-4 border-dashed rounded-lg'
        dropMessageStyle={{ border: 'none', backgroundColor: '#EEE' }}
        handleChange={onUpload}
      >
        <div className='flex flex-col items-center cursor-pointer'>
          <FilePlus weight='thin' className={getSize(10)} />
          <div className='mt-2'>Click or drag files here.</div>
        </div>
      </FileUploader>
    </div>
  );
};

export default FileList;
