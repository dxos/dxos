//
// Copyright 2025 DXOS.org
//

import { join } from 'path';

import { config, packages } from '../../.storybook/main.ts';

export default config({
  stories: [join(packages, '/ui/*/src/**/*.lit-stories.{mdx,tsx,ts}')],
});
