//
// Copyright 2024 DXOS.org
//

import { join } from 'path';

import { config, packages } from '../../.storybook/config';

export default config({
  stories: [
    join(packages, '/ui/*/src/**/*.lit-stories.{mdx,tsx,ts}'),
  ],
});
