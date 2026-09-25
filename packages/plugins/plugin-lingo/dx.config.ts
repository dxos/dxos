//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.lingo',
    name: 'Lingo',
    author: 'DXOS',
    description: trim`
      Build vocabulary in the languages you are studying.
      Collect words into decks, drill them with flashcards, harvest new terms from any document,
      and read documents or email with inline translations revealed on hover.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-lingo',
    icon: { key: 'ph--translate--regular', hue: 'teal' },
    tags: ['labs'],
    dependsOn: ['org.dxos.plugin.markdown'],
  },
});
