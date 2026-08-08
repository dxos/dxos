//
// Copyright 2025 DXOS.org
//

// Evaluate @dxos/halo-adapter-client in its own import tree before any story graph loads it:
// `storybook dev` serves source, story graphs race in arrival order, and on webkit the losing
// order enters this package's import cycle mid-evaluation — `ReferenceError: Cannot access
// 'makeSpaceService' before initialization`, swallowed by storybook's error boundary as an
// eternally "preparing" story. Preloading pins the cycle's entry point.
import '@dxos/halo-adapter-client';

import { preview } from '../../../../tools/storybook-react/.storybook/preview.ts';

export * from '../../../../tools/storybook-react/.storybook/preview.ts';
export default preview;
