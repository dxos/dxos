//
// Copyright 2022 DXOS.org
//

import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define.text({
  content: ({ input: { name, react, dxosUi } }) =>
    react && dxosUi &&
    plate`
    export default [
      {
        'en-US': {
          '${name}': {
            'current app name': '${name}',
            'loading label': 'Loading...',
            'need refresh label': 'Refresh now to get app updates',
            'need refresh description': 'You’ll need these updates to continue without interruption.',
            'refresh label': 'Refresh',
            'refresh alt': 'Click your browser’s refresh button or use the refresh keyboard shortcut.',
            'offline ready label': '{{appName}} is ready to use offline.',
            'confirm label': 'Okay',
          },
        },
      },
    ];
    `,
});
