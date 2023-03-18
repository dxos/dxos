// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { FrameObjectList } from '../../containers';
import FilePlugin from './FilePlugin';
import { FileFrameRuntime } from './defs';

// TODO(burdon): FrameObjectList requires entire module.
export const FileSelector: FC<{ onSelect: (objectId: string | undefined) => void }> = ({ onSelect }) => {
  return (
    <div>
      <FrameObjectList onSelect={onSelect} frameDef={FileFrameRuntime} />
      <FilePlugin onSelect={onSelect} />
    </div>
  );
};
