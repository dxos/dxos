//
// Copyright 2023 DXOS.org
//

import { DownloadSimple, File as FileIcon, FilePlus, XCircle } from 'phosphor-react';
import React, { FC, useState } from 'react';
import { FileUploader } from 'react-drag-drop-files';
import urlJoin from 'url-join';

import { id } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { useConfig, useQuery } from '@dxos/react-client';
import { getSize, useMediaQuery } from '@dxos/react-components';

import { Button, List, ListItemButton } from '../components';
import { useFileDownload, useIpfsClient, useSpace } from '../hooks';
import { File } from '../proto';

const images = ['JPG', 'PNG', 'GIF'];

// TODO(burdon): Wildcard?
// https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/accept
const fileTypes = [...images, 'TXT', 'MD', 'PDF', 'ZIP'];

/**
 * File/content preview.
 */
const Preview: FC<{ file: File }> = ({ file }) => {
  const config = useConfig();
  const url = urlJoin(config.values.runtime!.services!.ipfs!.gateway!, file.cid);

  const ext = file.name.split('.').at(-1)?.toUpperCase();
  const isImage = images.findIndex((value) => value === ext) !== -1;
  if (!isImage) {
    return <iframe className='w-full h-full' src={url} />;
  }

  const styles = [
    'margin: 0',
    'height: 100vh',
    `background-image: url(${url})`,
    'background-repeat: no-repeat',
    'background-position: center center',
    'background-size: contain'
  ];

  const doc = `<html><body style="${styles.join(';')}" /></html>`;

  return <iframe className='w-full h-full' srcDoc={doc} />;
};

export const FileFrame = () => {
  const config = useConfig();
  const space = useSpace();
  const files = useQuery(space, File.filter());
  const ipfsClient = useIpfsClient();
  const [selected, setSelected] = useState<File>();
  const download = useFileDownload();
  const [isMd] = useMediaQuery('md', { ssr: false });

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
    await space.experimental.db.save(file);
    setSelected(file);
  };

  // TODO(burdon): Factor out (ipfs hook/wrapper).
  const handleDownload = async (file: File) => {
    if (file.cid) {
      const url = urlJoin(config.values.runtime!.services!.ipfs!.gateway!, file.cid);
      const response = await fetch(url);
      const blob = await response.blob();
      download(blob, file.name);
    }
  };

  const Toolbar = () => {
    // TODO(burdon): Standardize toolbars.
    return (
      <div className='flex flex-shrink-0 w-full items-center p-2 bg-gray-200'>
        <div>{files.length > 0 ? (files.length === 1 ? '1 File' : `${files.length} Files`) : ''}</div>
        <div className='flex-1' />
        <Button onClick={() => setSelected(undefined)}>
          <XCircle className={getSize(6)} />
        </Button>
      </div>
    );
  };

  const FileList = () => {
    return (
      <div className='flex flex-1 overflow-x-hidden overflow-y-auto'>
        <List>
          {files.map((file) => (
            <ListItemButton
              key={file[id]}
              classes={{ hover: 'bg-orange-100', selected: 'bg-orange-200' }}
              selected={file.cid === selected?.cid}
              onClick={() => setSelected(file)}
            >
              <div>
                <FileIcon className={getSize(6)} />
              </div>
              <div className='mx-2 w-full overflow-hidden text-ellipsis whitespace-nowrap'>{file.name}</div>
              <Button onClick={() => handleDownload(file)}>
                <DownloadSimple className={getSize(6)} />
              </Button>
            </ListItemButton>
          ))}
        </List>
      </div>
    );
  };

  const FileUpload = () => {
    return (
      <div className='hidden md:flex flex-shrink-0 flex-col w-full h-[200px] p-2'>
        <FileUploader
          name='file'
          types={fileTypes}
          hoverTitle={' '}
          classes='flex flex-1 flex-col justify-center w-full h-full border-4 border-dashed rounded-lg'
          dropMessageStyle={{ border: 'none', backgroundColor: '#EEE' }}
          handleChange={handleUpload}
        >
          <div className='flex flex-col items-center cursor-pointer'>
            <FilePlus weight='thin' className={getSize(10)} />
            <div className='mt-2'>Click or drag files here.</div>
          </div>
        </FileUploader>
      </div>
    );
  };

  // TODO(burdon): Back button if PWA.
  // TODO(burdon): IPFS files don't load in Safari.
  if (selected && !isMd) {
    return (
      <div className='flex flex-1'>
        <Preview file={selected} />
      </div>
    );
  }

  return (
    <div className='flex flex-1'>
      <div className='hidden md:flex flex-1 flex-col'>
        <div className='flex flex-1 p-8 bg-gray-300'>{selected && <Preview file={selected} />}</div>
      </div>

      {/* TODO(burdon): Same width as side-bar. */}
      <div className='flex flex-col w-full md:w-[272px] h-full overflow-hidden'>
        <Toolbar />
        <FileList />
        <FileUpload />
      </div>
    </div>
  );
};
