//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SpaceCapabilities } from '@dxos/plugin-space/types';

import { Calendar, Mailbox } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Mailbox.Mailbox.typename,
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Mailbox.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          })),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Calendar.Calendar.typename,
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Calendar.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          })),
      }),
    ];
  }),
);
