//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

/** Shows notifications through the shell, which brings the main window back when one is clicked. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invoke } = yield* Effect.promise(() => import('@tauri-apps/api/core'));
    return Capability.contribute(AppCapabilities.LocalNotifier, {
      show: ({ title, body }) => invoke<void>('show_notification', { title, body }),
    });
  }),
);
