//
// Copyright 2023 DXOS.org
//

import { join } from 'path';

import { config, packages } from '../../.storybook/config';

export default config({
  stories: [
    join(packages, '/sdk/react-client/src/**/*.stories.tsx'),
    join(packages, '/sdk/shell/src/stories/Invitations.e2e-stories.tsx'),
    join(packages, '/ui/react-ui-stack/src/**/*.stories.tsx'),
  ],
});
