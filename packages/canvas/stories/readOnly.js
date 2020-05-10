//
// Copyright 2020 DxOS, Inc.
//

import React from 'react';
import { withKnobs } from "@storybook/addon-knobs";

import { FullScreen } from '@dxos/gem-core';

import { Canvas, useCanvasModel } from '../src';

import { data } from './testing';

export default {
  title: 'Canvas',
  decorators: [withKnobs]
};

export const withReadOnly = () => {
  const [objects] = useCanvasModel(data);

  return (
    <FullScreen>
      <Canvas objects={objects} showToolbar={false} showPalette={false} />
    </FullScreen>
  );
};
