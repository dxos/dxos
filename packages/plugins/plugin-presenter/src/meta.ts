//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/presenter',
  name: 'Presenter',
  description: trim`
    Transform markdown documents into interactive presentation slideshows.
    Navigate between slides with keyboard controls and present content in full-screen mode.
  `,
  icon: 'ph--presentation--regular',
  iconHue: 'indigo',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-presenter',
};
