//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { Heading } from './Heading';

export default {
  component: Heading
};

export const Default = { args: { level: 1, children: 'Hello' } };
export const Level2 = { args: { ...Default.args, level: 2 } };
export const Level3 = { args: { ...Default.args, level: 3 } };
export const Level4 = { args: { ...Default.args, level: 4 } };
export const Level5 = { args: { ...Default.args, level: 5 } };
export const Level6 = { args: { ...Default.args, level: 6 } };
