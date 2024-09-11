//
// Copyright 2023 DXOS.org
//

import { join } from 'path';

import { config, packages } from '../../.storybook/config';

export default config({
  stories: [
    join(packages, '/apps/*/src/**/*.stories.{mdx,tsx}'),
    join(packages, '/experimental/*/src/**/*.stories.{mdx,tsx}'),
    join(packages, '/plugins/*/src/**/*.stories.{mdx,tsx}'),
    join(packages, '/plugins/experimental/*/src/**/*.stories.{mdx,tsx}'),
    join(packages, '/sdk/*/src/**/*.stories.{mdx,tsx}'),
    join(packages, '/ui/*/src/**/*.stories.{mdx,tsx}'),
  ],
});
