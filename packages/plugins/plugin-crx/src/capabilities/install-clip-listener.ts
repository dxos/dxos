//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';

import { CrxCapabilities, Settings } from '#types';

import { installClipListener } from '../listener';
import { meta } from '../meta';

const SUCCESS_TOAST_BY_KIND: Record<string, string> = {
  person: 'toast.person.title',
  organization: 'toast.organization.title',
  note: 'toast.note.title',
};

const ERROR_TOAST_BY_CODE: Record<string, string> = {
  invalidPayload: 'toast.error.invalidPayload.message',
  unsupportedVersion: 'toast.error.unsupportedVersion.message',
  disabled: 'toast.error.disabled.message',
  unsupportedKind: 'toast.error.unsupportedKind.message',
  noSpace: 'toast.error.noSpace.message',
  internal: 'toast.error.internal.message',
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilityManager = yield* Capability.Service;
    const invoker = yield* Capability.get(Capabilities.OperationInvoker);
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const settingsAtom = yield* Capability.get(CrxCapabilities.Settings);

    installClipListener(capabilityManager, invoker, (ack, detail) => {
      const kind = (detail as { kind?: string } | null)?.kind;
      if (ack.ok) {
        const key = (kind && SUCCESS_TOAST_BY_KIND[kind]) ?? 'toast.person.title';
        void invoker.invokePromise(LayoutOperation.AddToast, {
          id: `${meta.id}.clip-${ack.id}`,
          title: [key, { ns: meta.id }],
        });
        if (Settings.withDefaults(registry.get(settingsAtom)).autoOpenAfterClip) {
          void invoker.invokePromise(LayoutOperation.Open, { subject: [ack.id] });
        }
      } else {
        const errorKey = ERROR_TOAST_BY_CODE[ack.error] ?? 'toast.error.internal.message';
        void invoker.invokePromise(LayoutOperation.AddToast, {
          id: `${meta.id}.error-${Date.now()}`,
          title: ['toast.error.title', { ns: meta.id }],
          description: [errorKey, { ns: meta.id }],
        });
      }
    });

    log.info('CRX bridge installed');
  }),
);
