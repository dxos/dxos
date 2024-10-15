//
// Copyright 2018 DXOS.org
//

import '@dxos-theme';

import { Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Leva, useControls } from 'leva';
import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

export default {
  title: 'gem-globe/drei',
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'bg-[#111]' })],
};

const Component = () => {
  useControls({});

  return (
    <>
      <Leva />
    </>
  );
};

export const Default = () => {
  return (
    <Canvas>
      <Component />
      <Stats />
    </Canvas>
  );
};
