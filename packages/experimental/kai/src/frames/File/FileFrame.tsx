//
// Copyright 2023 DXOS.org
//

import React from 'react';
import urlJoin from 'url-join';

import { useConfig } from '@dxos/react-client';

import { FilePreview } from '../../components';
import { useFrameState } from '../../hooks';
import { File } from '../../proto';
import { imageTypes } from './defs';

export const FileFrame = () => {
  const config = useConfig();
  const { space, objectId } = useFrameState();
  const object = objectId ? (space!.experimental.db.getObjectById(objectId) as File) : undefined;
  if (!object) {
    return null;
  }

  const url = urlJoin(config.values.runtime!.services!.ipfs!.gateway!, object.cid);
  const ext = object.name.split('.').at(-1)?.toLowerCase();
  const image = imageTypes.findIndex((value) => value === ext) !== -1;

  return (
    <div className='flex flex-1 p-4 bg-panel-bg'>
      <FilePreview url={url} image={image} />
    </div>
  );
};

export default FileFrame;
