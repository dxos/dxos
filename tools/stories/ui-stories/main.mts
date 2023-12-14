//
// Copyright 2023 DXOS.org
//

import { resolve } from 'node:path';
import { config } from '../.storybook-shared/config';

export default config({ stories: ['../../../packages/ui/react-ui/src/**/*.stories.tsx'] }, resolve(__dirname, '../.././packages/ui'));
