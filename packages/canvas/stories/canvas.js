//
// Copyright 2020 DxOS, Inc.
//

import React from 'react';
import { withKnobs } from "@storybook/addon-knobs";

import { FullScreen } from '@dxos/gem-core';

import { Canvas, createObject } from '../src';

export default {
  title: 'Canvas',
  decorators: [withKnobs]
};

export const withGrapher = () => {
  const data = [
    createObject('ellipse', {
      bounds: { x: -40, y: 0, width: 20, height: 20 }
    }),
    createObject('path', {
      bounds: { x: -20, y: 10 },
      points: [{ x: 0, y: 0 }, { x: 40, y: 0}]
    }),
    createObject('rect', {
      bounds: { x: 20, y: 0, width: 20, height: 20 }
    }),
  ];

  return (
    <FullScreen>
      <Canvas data={data} />
    </FullScreen>
  );
};
