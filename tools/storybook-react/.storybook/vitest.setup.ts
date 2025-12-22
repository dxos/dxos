//
// Copyright 2025 DXOS.org
//

import { setProjectAnnotations } from '@storybook/react';
import { beforeAll } from 'vitest';

import * as preview from './preview';

/**
 * https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations
 */
const annotations = setProjectAnnotations([preview]);

// Run Storybook's beforeAll hook.
beforeAll(annotations.beforeAll);
