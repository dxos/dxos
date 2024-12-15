//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Editor } from './Editor';
import { type CanvasType } from '../types';

export const CanvasContainer = ({ canvas }: { canvas: CanvasType }) => {
  return (
    <Editor.Root>
      <Editor.Canvas />
      <Editor.UI />
    </Editor.Root>
  );
};

export default CanvasContainer;
