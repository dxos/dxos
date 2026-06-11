//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';

import { CrxCapabilities, Settings } from '#types';

import { meta } from '../meta';
import { installPageActionListeners } from '../page-actions';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilityManager = yield* Capability.Service;
    const invoker = yield* Capability.get(Capabilities.OperationInvoker);
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const settingsAtom = yield* Capability.get(CrxCapabilities.Settings);

    // NOTE: The `Label` tuple only supports `ns`/`count`/`defaultValue`, so the
    // success toast uses a plain key rather than interpolating the action label.
    installPageActionListeners(capabilityManager, invoker, (ack) => {
      if (ack.ok) {
        void invoker.invokePromise(LayoutOperation.AddToast, {
          id: `${meta.id}.page-action-${ack.objectId ?? ack.id}`,
          title: ['toast.page-action.success.title', { ns: meta.id }],
        });
        if (ack.objectId && Settings.withDefaults(registry.get(settingsAtom)).autoOpenAfterClip) {
          void invoker.invokePromise(LayoutOperation.Open, { subject: [ack.objectId] });
        }
      } else {
        void invoker.invokePromise(LayoutOperation.AddToast, {
          id: `${meta.id}.page-action-error-${Date.now()}`,
          title: ['toast.page-action.error.title', { ns: meta.id }],
          description: [`toast.error.${ack.error}.message`, { ns: meta.id }],
        });
      }
    });

    log.info('CRX page-actions bridge installed');
  }),
);
