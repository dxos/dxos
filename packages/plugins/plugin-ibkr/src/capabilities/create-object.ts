//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import * as Ibkr from '../types/Ibkr';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributeAll(SpaceCapabilities.CreateObjectEntry, [
        {
          id: Type.getTypename(Ibkr.Portfolio),
          createObject: (_props, options) =>
            Effect.gen(function* () {
              const object = Ibkr.makePortfolio();
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                targetNodeId: options.targetNodeId,
              });
            }),
        },
        {
          id: Type.getTypename(Ibkr.Instrument),
          createObject: (_props, options) =>
            Effect.gen(function* () {
              const object = Ibkr.makeInstrument({ name: 'New Instrument', symbol: '' });
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                targetNodeId: options.targetNodeId,
              });
            }),
        },
      ]),
    ];
  }),
);
