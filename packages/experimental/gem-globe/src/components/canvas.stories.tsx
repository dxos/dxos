//
// Copyright 2018 DXOS.org
//

import '@dxos-theme';

import { withFullscreen, withTheme } from '@dxos/storybook-utils';

export default {
  title: 'gem-globe/canvas',
  decorators: [withTheme, withFullscreen({ classNames: 'bg-[#111]' })],
};

export const Default = () => null;
