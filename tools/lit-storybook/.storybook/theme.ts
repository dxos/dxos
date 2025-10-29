//
// Copyright 2022 DXOS.org
//

import { type Decorator } from '@storybook/react';
import { html } from 'lit';
import { create } from 'storybook/theming';

export const dxosTheme = create({
  base: 'dark',
  brandTitle: 'DXOS',
  brandImage: '/dxos.png',
  brandTarget: '_blank',
  brandUrl: 'https://github.com/dxos',
  appBg: '#1e1e1e',
});

export const docsTheme = create({
  base: 'dark',
  brandTitle: 'DXOS',
  brandImage: '/dxos.png',
  colorPrimary: '#1EA7FD',
  textColor: '#ffffff',
  appBg: '#1e1e1e',
});

export const withLayout: Decorator = (Story, context) => {
  switch (context.parameters.layout) {
    case 'fullscreen':
      return html`
        <div role="none" className="fixed inset-0 flex flex-col overflow-hidden bg-baseSurface">${Story()}</div>
      `;

    default:
      return Story();
  }
};
