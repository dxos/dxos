//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { HaloButton } from './HaloButton';

export const Default = (props: any) => {
  return <HaloButton {...props} />;
};

const meta: Meta<typeof HaloButton> = {
  title: 'plugins/plugin-navtree/HaloButton',
  component: HaloButton,
};

export default meta;
