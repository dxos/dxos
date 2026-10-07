//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { ViewModel } from '@dxos/schema';

import { ExplorerAction, Graph } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Graph.Graph),
      inputSchema: ExplorerAction.GraphProps,
      createObject: (props, options) =>
        Effect.gen(function* () {
          const object = yield* Effect.promise(async () => {
            const view = props.typename
              ? (await ViewModel.makeFromDatabase({ db: options.db, typename: props.typename })).view
              : undefined;
            return Graph.make({ name: props.name, view });
          });
          return yield* Operation.invoke(
            SpaceOperation.AddObject,
            {
              object,
              target: options.target,
            },
            { spaceId: options.db.spaceId },
          );
        }),
    });
  }),
);
