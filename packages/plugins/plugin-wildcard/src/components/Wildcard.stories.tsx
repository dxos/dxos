//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';

import { create } from '@dxos/react-client/echo';

import Wildcard from './Wildcard';

export const Default = {};

const meta: Meta<typeof Wildcard> = {
  title: 'plugins/plugin-wildcard/Wildcard',
  component: Wildcard,
  args: {
    item: { id: 'test', object: create({ title: 'plugins/Test', other: 'details' }) },
  },
};

export default meta;
