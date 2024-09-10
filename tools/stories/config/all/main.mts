//
// Copyright 2023 DXOS.org
//

import { config, packages } from '../../.storybook/config';

export default config({
  stories: [
    `${packages}/apps/*/src/**/*.stories.{mdx,tsx}`,
    `${packages}/experimental/*/src/**/*.stories.{mdx,tsx}`,
    `${packages}/plugins/*/src/**/*.stories.{mdx,tsx}`,
    `${packages}/plugins/experimental/*/src/**/*.stories.{mdx,tsx}`,
    `${packages}/sdk/*/src/**/*.stories.{mdx,tsx}`,
    `${packages}/ui/*/src/**/*.stories.{mdx,tsx}`,
  ],
});
