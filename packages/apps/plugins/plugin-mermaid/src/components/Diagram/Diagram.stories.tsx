//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { Diagram } from './Diagram';

export default {
  component: Diagram,
};

export const Graph = {
  args: {
    content: 'graph TD; A-->B; A-->C; B-->D; C-->D;',
  },
};

export const Flowchart = {
  args: {
    content: [
      'flowchart LR',
      'A[Hard] -->|Text| B(Round)',
      'B --> C{Decision}',
      'C -->|One| D[Result 1]',
      'C -->|Two| E[Result 2]',
    ].join('\n'),
  },
};
