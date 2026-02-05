//
// Copyright 2022 DXOS.org
//

import { type Decorator } from '@storybook/web-components-vite';
import { html } from 'lit';

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
