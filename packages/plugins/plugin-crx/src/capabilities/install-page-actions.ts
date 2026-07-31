//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';

import { meta } from '#meta';
import { CrxCapabilities, Settings } from '#types';

import { installPageActionListeners } from '../page-actions';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilityManager = yield* Capability.Service;
    const invoker = yield* Capabilities.OperationInvoker;
    const registry = yield* Capabilities.AtomRegistry;
    const settingsAtom = yield* CrxCapabilities.Settings;

    // NOTE: The `Label` tuple only supports `ns`/`count`/`defaultValue`, so the
    // success toast uses a plain key rather than interpolating the action label.
    installPageActionListeners(capabilityManager, invoker, (ack) => {
      if (ack.ok) {
        void invoker.invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}.page-action-${ack.objectId ?? ack.id}`,
          title: ['toast.page-action.success.title', { ns: meta.profile.key }],
        });
        if (ack.objectId && Settings.withDefaults(registry.get(settingsAtom)).autoOpenAfterClip) {
          void invoker.invokePromise(LayoutOperation.Open, { subject: [ack.objectId] });
        }
      } else {
        void invoker.invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}.page-action-error-${Date.now()}`,
          title: ['toast.page-action.error.title', { ns: meta.profile.key }],
          description: [`toast.error.${ack.error}.message`, { ns: meta.profile.key }],
        });
      }
    });

    log.info('CRX page-actions bridge installed');

    return [];
  }),
);
