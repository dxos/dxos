//
// Copyright 2025 DXOS.org
//

import { type Decorator } from 'storybook-solidjs-vite';

export const withLayout: Decorator = (Story, context) => {
  switch (context.parameters.layout) {
    case 'fullscreen':
      return (
        <div role='none' className='fixed inset-0 flex flex-col overflow-hidden bg-baseSurface'>
          <Story />
        </div>
      );

    default:
      return <Story />;
  }
};
