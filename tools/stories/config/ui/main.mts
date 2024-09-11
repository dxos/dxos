//
// Copyright 2023 DXOS.org
//

import { resolve } from 'node:path';

import { config, packages } from '../../.storybook/config';

export default config(
  {
    stories: [
      `${packages}/ui/react-ui/src/**/*.stories.tsx`,
    ]
  },
  resolve(__dirname, `${packages}/ui`),
);
