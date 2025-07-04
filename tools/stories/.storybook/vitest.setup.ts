//
// Copyright 2025 DXOS.org
//

import { setProjectAnnotations } from '@storybook/react';
import { beforeAll } from 'vitest';

import * as preview from './preview';

/**
 * https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#example-configuration-files
 */
const annotations = setProjectAnnotations([preview]);

// Run Storybook's beforeAll hook.
beforeAll(annotations.beforeAll);
