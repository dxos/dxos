//
// Copyright 2024 DXOS.org
//

import { type Migration } from '@dxos/migrations';

// NOTE: When removing migrations, consider state of space properties which store the version keys of latest migration.
export const __COMPOSER_MIGRATIONS__: Migration[] = [
  {
    version: '2024-06-10-collections',
    next: async ({ space, builder }) => {},
  },
  {
    version: '2024-06-12/fully-qualified-typenames',
    next: async ({ space, builder }) => {},
  },
];
