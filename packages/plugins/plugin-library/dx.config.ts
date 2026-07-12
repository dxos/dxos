//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.library',
    name: 'Library',
    author: 'DXOS',
    description: trim`
    Library is a personal reading list built on ECHO. Each book is an ECHO object with a public,
    catalog-eligible face (title, authors, reading status, rating, review) and a private face that
    never leaves the space (notes, ownership, personal tags).

    Books are created with a type-ahead backed by BookHive's public catalog, which resolves a title
    to its authors, cover, and genres. The public face of a book carries an atproto record annotation,
    so the generic atproto companion can publish it as a buzz.bookhive.book record on the user's PDS —
    a concrete demonstration of the ECHO ↔ atproto publishing model.
  `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-library',
    icon: { key: 'ph--book-open--regular', hue: 'amber' },
    spec: 'PLUGIN.mdl',
    screenshots: [],
    tags: ['labs'],
  },
});
