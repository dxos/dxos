//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Obj, Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { Sketch } from '#types';

import { getSketchesPath } from '../paths';

const typename = Type.getTypename(Sketch.Sketch);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: typename,
      createObject: (props, options) =>
        Effect.gen(function* () {
          const object = Sketch.make(props);
          const db = Database.isDatabase(options.target) ? options.target : Obj.getDatabase(options.target);
          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object,
            target: options.target,
            hidden: true,
            targetNodeId: options.targetNodeId ?? (db ? getSketchesPath(db.spaceId) : undefined),
          });
        }),
    });
  }),
);
