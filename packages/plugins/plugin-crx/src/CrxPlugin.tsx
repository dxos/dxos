//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin, LayoutOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';

import { CrxSettings, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

import { installClipListener } from './listener';

const SUCCESS_TOAST_BY_KIND: Record<string, string> = {
  person: 'toast.person.title',
  organization: 'toast.organization.title',
  note: 'toast.note.title',
};

export const CrxPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSettingsModule({ activate: CrxSettings }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'install-crx-bridge',
    activatesOn: ActivationEvents.OperationInvokerReady,
    activate: Effect.fnUntraced(function* () {
      const capabilityManager = yield* Capability.Service;
      const invoker = yield* Capability.get(Capabilities.OperationInvoker);

      installClipListener(capabilityManager, invoker, (ack, detail) => {
        const kind = (detail as { kind?: string } | null)?.kind;
        if (ack.ok) {
          const key = (kind && SUCCESS_TOAST_BY_KIND[kind]) ?? 'toast.person.title';
          void invoker.invokePromise(LayoutOperation.AddToast, {
            id: `${meta.id}.clip-${ack.id}`,
            title: [key, { ns: meta.id }],
          });
        } else {
          void invoker.invokePromise(LayoutOperation.AddToast, {
            id: `${meta.id}.error-${Date.now()}`,
            title: ['toast.error.title', { ns: meta.id }],
            description: [`toast.error.${ack.error}.message`, { ns: meta.id }],
          });
        }
      });

      log.info('CRX bridge installed');
    }),
  }),
  Plugin.make,
);

export default CrxPlugin;
