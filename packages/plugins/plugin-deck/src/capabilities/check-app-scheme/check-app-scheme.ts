//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { isTauri } from '@dxos/util';

import { DeckCapabilities } from '../../types';

/** Identifier for the native redirect dialog surface (defined in welcome plugin). */
const NATIVE_REDIRECT_DIALOG = 'org.dxos.plugin.welcome.component.native-redirect-dialog';

const isSafari = (): boolean => {
  const ua = navigator.userAgent;
  return ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium');
};

/**
 * When running in a web browser (not Tauri) with native redirect enabled,
 * shows a dialog offering to open the page in the native Composer app.
 * In Safari, universal links handle this natively so the dialog is skipped.
 */
// TODO(mjamesderocher): Factor out as part of NavigationPlugin.
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);
    const settings = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);
    if (!isTauri() && !isSafari() && settings?.enableNativeRedirect) {
      yield* Effect.promise(() =>
        invokePromise(LayoutOperation.UpdateDialog, {
          subject: NATIVE_REDIRECT_DIALOG,
          type: 'alert',
          overlayClasses: 'dark bg-neutral-950!',
        }),
      );
    }
  }),
);
