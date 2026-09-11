//
// Copyright 2026 DXOS.org
//

import type * as Tour from '@dxos/plugin-support/Tour';

/** Contributed into whatever tour is running for an object that can carry comments. */
export const steps: Tour.Step[] = [
  {
    target: '[data-testid="comments.comment.add"]',
    title: 'Comments',
    description: 'Select text and leave a comment. Threads live beside the object in the companion pane.',
    placement: 'bottom',
  },
];

export default steps;
