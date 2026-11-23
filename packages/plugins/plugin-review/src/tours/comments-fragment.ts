//
// Copyright 2026 DXOS.org
//

import * as Tour from '@dxos/app-toolkit/Tour';

export const steps: Tour.Step[] = [
  Tour.toolbarStep('comments.comment.add', {
    title: 'Comments',
    description: 'Select text and leave a comment. Threads live beside the object in the companion pane.',
    placement: 'bottom',
  }),
];

export default steps;
