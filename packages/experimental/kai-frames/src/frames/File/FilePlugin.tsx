//
// Copyright 2023 DXOS.org
//

import { DownloadSimple } from '@phosphor-icons/react';
import React, { FC } from 'react';
import urlJoin from 'url-join';

import { Button, useMediaQuery } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { File } from '@dxos/kai-types';
import { log } from '@dxos/log';
import { EditableObjectList } from '@dxos/mosaic';
import { useConfig } from '@dxos/react-client';
import { Space, useQuery } from '@dxos/react-client/echo';

import { FileUpload } from './FileUpload';
import { FileFrameRuntime, defaultFileTypes } from './defs';
import { useFileDownload, useIpfsClient } from '../../hooks';

// TODO(burdon): Plugin signature.
export type FileListProps = {
  space: Space;
  onSelect?: (objectId: string | undefined) => void;
  disableDownload?: boolean;
  fileTypes?: string[];
};

// TODO(burdon): Rename.
export const FilePlugin: FC<FileListProps> = ({ space, disableDownload, fileTypes = defaultFileTypes, onSelect }) => {
  const frameDef = FileFrameRuntime;
  const config = useConfig();
  const ipfsClient = useIpfsClient();
  const download = useFileDownload();
  const [isMd] = useMediaQuery('md', { ssr: false });
  const objects = useQuery(space, File.filter());
  if (!space) {
    return null;
  }

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
    onSelect?.(file.id);
  };

  // TODO(burdon): Factor out (ipfs hook/wrapper).
  const handleDownload = async (object: File) => {
    if (object?.cid) {
      const url = urlJoin(config.values.runtime!.services!.ipfs!.gateway!, object.cid);
      const response = await fetch(url);
      const blob = await response.blob();
      download(blob, object.name);
    }
  };

  const handleUpdate = async (objectId: string, text: string) => {
    const object = objects.find((object) => object.id === objectId);
    if (object && frameDef.title) {
      (object as any)[frameDef.title] = text;
    }
  };

  const DownloadAction = ({ object }: { object: File }) => (
    <Button variant='ghost' onClick={() => handleDownload(object)}>
      <DownloadSimple className={getSize(6)} />
    </Button>
  );

  return (
    <div className='flex flex-col w-full'>
      <EditableObjectList<File>
        objects={objects}
        // selected={objectId}
        Icon={FileFrameRuntime.Icon}
        Action={disableDownload ? undefined : DownloadAction}
        getTitle={(object) => object.name}
        onSelect={onSelect}
        onUpdate={handleUpdate}
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
