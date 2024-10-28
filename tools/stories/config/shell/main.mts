//
// Copyright 2023 DXOS.org
//

import { join } from 'path';

import { config, packages } from '../../.storybook/main';

export default config({
  stories: [join(packages, '/sdk/shell/src/**/*.stories.tsx')],
});
