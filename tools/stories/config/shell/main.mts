//
// Copyright 2023 DXOS.org
//

import { config, packages } from '../../.storybook/config';

export default config({
  stories: [
    `${packages}/sdk/shell/src/**/*.stories.tsx`,
  ]
});
