//
// Copyright 2020 DxOS.org
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

export const withCanvas = () => {
  const [objects, model] = useCanvasModel(data);

  return (
    <FullScreen>
      <Canvas objects={objects} model={model} />
    </FullScreen>
  );
};
