//
// Copyright 2023 DXOS.org
//

import { config, packages } from '../../.storybook/config';

export default config({
  stories: [
    `${packages}/sdk/examples/src/stories/examples.stories.tsx`,
  ]
});
