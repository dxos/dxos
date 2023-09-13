//
// Copyright 2023 DXOS.org
//

import React from 'react';
import urlJoin from 'url-join';

import { File } from '@dxos/kai-types';
import { useConfig } from '@dxos/react-client';

import { imageTypes } from './defs';
import { FilePreview } from '../../components';
import { useFrameContext } from '../../hooks';

export const FileFrame = () => {
  const config = useConfig();
  const { space, objectId } = useFrameContext();
  const object = objectId ? space!.db.getObjectById<File>(objectId) : undefined;
  if (!object) {
    return null;
  }

  const url = urlJoin(config.values.runtime!.services!.ipfs!.gateway!, object.cid);
  const ext = object.name.split('.').at(-1)?.toLowerCase();
  const image = imageTypes.findIndex((value) => value === ext) !== -1;

  return (
    <div className='flex flex-1 pt-2 md:p-4'>
      <FilePreview url={url} image={image} />
    </div>
  );
};

export default FileFrame;
