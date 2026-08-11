//
// Copyright 2025 DXOS.org
//

// Pins evaluation order under `storybook dev`: story graphs evaluate in arrival order, and the
// losing order leaves this package's bindings uninitialized (TDZ on `makeSpaceService`) — no
// static cycle exists — swallowed by storybook's error boundary as an eternally "preparing" story.
import '@dxos/halo-adapter-client';

import { preview } from '../../../../tools/storybook-react/.storybook/preview.ts';

export * from '../../../../tools/storybook-react/.storybook/preview.ts';
export default preview;
