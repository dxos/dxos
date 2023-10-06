//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { FC, HTMLAttributes } from 'react';

import { TestComponentProps } from './test';
import { Canvas } from '../Canvas';

export const DemoCanvas: FC<TestComponentProps<any> & HTMLAttributes<HTMLDivElement>> = ({ id, debug, className }) => {
  return (
    <Canvas.Root id={id} debug={debug} className={className}>
      <Canvas.Viewport />
    </Canvas.Root>
  );
};
