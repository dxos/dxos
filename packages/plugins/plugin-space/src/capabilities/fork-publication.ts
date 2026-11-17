//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { log } from '@dxos/log';

import { SpaceOperation, type SpaceSchema } from '#types';

import { SpaceNamespace } from '../namespace.ts';
import { takeForkIntent } from '../publication/pending-fork.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* (options: SpaceSchema.SpacePluginOptions = {}) {
    const pending = options.publication ? takeForkIntent() : undefined;
    if (!pending) {
      return [];
    }
    const invoker = yield* Capabilities.OperationInvoker;
    log.info('forking publication', { publicId: pending.publicId });
    void invoker
      .invokePromise(SpaceOperation.ForkPublication, { publicId: pending.publicId, path: pending.path })
      .then(({ error }) => {
        if (error) {
          log.warn('fork failed', { error, publicId: pending.publicId });
          void invoker.invokePromise(LayoutOperation.AddToast, {
            id: `${SpaceNamespace.key}/fork-failed`,
            title: ['fork-failed-toast.title', { ns: SpaceNamespace.key }],
            icon: 'ph--warning--regular',
          });
        }
      });
    return [];
  }),
);
