//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import * as Instrument from '@dxos/plugin-sequencer/Instrument';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { SCALES } from '#audio';

import { scaleToTuning } from '../notation/index.ts';

/** New instruments are handpans in the first preset scale; the scale can be changed in the tuner. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Instrument.Instrument),
      createObject: (props: Partial<Parameters<typeof Instrument.make>[0]> | undefined, options) =>
        Effect.gen(function* () {
          const object = Instrument.make({
            name: 'Handpan',
            family: 'handpan',
            tuning: scaleToTuning(SCALES[0]),
            ...props,
          });
          return yield* Operation.invoke(
            SpaceOperation.AddObject,
            { object, target: options.target },
            { spaceId: options.db.spaceId },
          );
        }),
    });
  }),
);
