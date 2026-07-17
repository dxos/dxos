//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { CrxCapabilities, type PageAction } from '@dxos/plugin-crx/types';

import { meta } from '#meta';
import { BookmarkOperation } from '#types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    // Typed array so the contribution is checked against CrxCapabilities.PageAction's value type.
    const actions: PageAction.PageAction[] = [
      {
        id: `${meta.profile.key}/page-action/add-bookmark`,
        label: 'Add bookmark',
        icon: 'ph--bookmark-simple--regular',
        urlPatterns: ['http://*/*', 'https://*/*'],
        extractor: { name: 'snapshot' },
        contexts: ['popup', 'page', 'picker'],
        operation: BookmarkOperation.AddFromSnapshot,
      },
    ];
    return [Capability.provide(CrxCapabilities.PageAction, actions)];
  }),
);
