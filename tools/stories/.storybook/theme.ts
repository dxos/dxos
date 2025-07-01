//
// Copyright 2022 DXOS.org
//

import { create } from '@storybook/theming';

export const dxosTheme = create({
  base: 'dark',
  brandTitle: 'DXOS',
  brandImage: '/dxos.png',
  brandTarget: '_blank',
  brandUrl: 'https://github.com/dxos',
});

export const docsTheme = create({
  base: 'dark',
  brandTitle: 'DXOS',
  brandImage: '/dxos.png',
  colorPrimary: '#1EA7FD',
  appBg: '#1e1e1e',
  textColor: '#ffffff',
});
