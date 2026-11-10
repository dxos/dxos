//
// Copyright 2026 DXOS.org
//

import * as Harness from '@dxos/plugin-testing/Harness';

import config from '../dx.config.ts';
import { make } from './types/Bookmark.ts';
import { RecordVisit } from './types/BookmarkOperation.ts';

// #region harness
// Boots a headless Composer with only this plugin and the core plugins it needs.
await using harness = await Harness.createComposerTestApp({ plugins: [config.make()] });

const bookmark = make({ name: 'DXOS', url: 'https://dxos.org' });
const { visits } = await harness.invoke(RecordVisit, { bookmark });
console.log(visits); // 1
// #endregion
