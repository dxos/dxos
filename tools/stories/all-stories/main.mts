//
// Copyright 2023 DXOS.org
//

import { config } from '../.storybook-shared/config';

export default config({
  stories: [
    '../../../packages/ui/*/src/**/*.stories.{mdx,tsx}',
    '../../../packages/sdk/*/src/**/*.stories.{mdx,tsx}',
    '../../../packages/apps/*/src/**/*.stories.{mdx,tsx}',
    '../../../packages/apps/plugins/*/src/**/*.stories.{mdx,tsx}',
  ],
});
