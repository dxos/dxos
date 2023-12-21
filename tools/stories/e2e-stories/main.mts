//
// Copyright 2023 DXOS.org
//

import { config } from '../.storybook-shared/config';

export default config({
  stories: [
    '../../../packages/sdk/react-shell/src/stories/Invitations.e2e-stories.tsx',
    '../../../packages/sdk/react-client/src/**/*.stories.tsx',
    '../../../packages/ui/react-ui-stack/src/**/*.stories.tsx',
  ],
});
