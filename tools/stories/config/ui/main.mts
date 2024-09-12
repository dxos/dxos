//
// Copyright 2023 DXOS.org
//

import { join } from 'path';

import { config, packages } from '../../.storybook/config';

export default config(
  {
    stories: [
      join(packages, '/ui/react-ui/src/**/*.stories.tsx'),
    ]
  },
  join(__dirname, packages, '/ui'),
);
