//
// Copyright 2023 DXOS.org
//

import { join } from 'path';

import { createConfig, packages } from '../../.storybook/main';

export default createConfig({
  stories: [join(packages, '/sdk/examples/src/stories/examples.stories.tsx')],
});
