//
// Copyright 2025 DXOS.org
//

import { createJSXDecorator } from 'storybook-solidjs-vite';

export const solidDecorator = createJSXDecorator((Story, context) => {
  return (
    <main>
      <Story />
    </main>
  );
});
