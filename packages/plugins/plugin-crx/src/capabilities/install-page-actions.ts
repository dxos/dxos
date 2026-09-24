//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import { EID, EntityId } from '@dxos/keys';
import { log } from '@dxos/log';

import { meta } from '#meta';
import { CrxCapabilities, Settings } from '#types';

import { installPageActionListeners } from '../page-actions.ts';

const openObject = async (invoker: Capabilities.OperationInvoker, uri: EID.EID) => {
  const { data } = await invoker.invokePromise(NavigationOperation.ResolveNavigationTargets, { query: { uri } });
  const path = data?.targets[0]?.path;
  if (path) {
    await invoker.invokePromise(LayoutOperation.Open, { subject: [path] });
  }
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilityManager = yield* Capability.Service;
    const invoker = yield* Capabilities.OperationInvoker;
    const registry = yield* Capabilities.AtomRegistry;
    const settingsAtom = yield* CrxCapabilities.Settings;

    // NOTE: The `Label` tuple only supports `ns`/`count`/`defaultValue`, so the
    // success toast uses a plain key rather than interpolating the action label.
    installPageActionListeners(capabilityManager, invoker, (ack, _label, spaceId) => {
      if (ack.ok) {
        void invoker.invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}.page-action-${ack.objectId ?? ack.id}`,
          title: ['toast.page-action.success.title', { ns: meta.profile.key }],
        });
        const entityId = ack.objectId;
        if (
          spaceId &&
          entityId &&
          EntityId.isValid(entityId) &&
          Settings.withDefaults(registry.get(settingsAtom)).autoOpenAfterClip
        ) {
          void openObject(invoker, EID.make({ spaceId, entityId }));
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
