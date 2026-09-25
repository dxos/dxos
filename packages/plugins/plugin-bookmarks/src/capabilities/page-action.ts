//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as CrxCapabilities from '@dxos/plugin-crx/CrxCapabilities';
import type * as PageAction from '@dxos/plugin-crx/PageAction';

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
    return Capability.contribute(CrxCapabilities.PageAction, actions);
  }),
);
