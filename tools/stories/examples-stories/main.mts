//
// Copyright 2023 DXOS.org
//

import { resolve } from 'node:path';

import { config } from '../.storybook-shared/config';

export default config({ stories: ['../../../packages/sdk/examples/src/stories/*.stories.tsx'] }, resolve(__dirname, '../../../packages/sdk/examples'));
