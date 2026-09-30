//
// Copyright 2026 DXOS.org
//

import type * as Tour from '@dxos/app-toolkit/Tour';

export const steps: Tour.Step[] = [
  {
    target: '[data-testid="comments.comment.add"]',
    title: 'Comments',
    description: 'Select text and leave a comment. Threads live beside the object in the companion pane.',
    placement: 'bottom',
  },
];

export default steps;
