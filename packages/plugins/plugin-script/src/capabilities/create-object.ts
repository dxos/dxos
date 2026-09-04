//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as Script from '@dxos/compute/Script';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { Notebook, ScriptOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributeAll(SpaceCapabilities.CreateObjectEntry, [
        {
          id: Type.getTypename(Script.Script),
          inputSchema: ScriptOperation.ScriptProps,
          createObject: (props, options) =>
            Effect.gen(function* () {
              const { object } = yield* Operation.invoke(ScriptOperation.CreateScript, props);
              return yield* Operation.invoke(
                SpaceOperation.AddObject,
                {
                  object,
                  target: options.target,
                },
                { spaceId: options.db.spaceId },
              );
            }),
        },
        {
          id: Type.getTypename(Notebook.Notebook),
          inputSchema: ScriptOperation.NotebookProps,
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = Notebook.make(props);
              return yield* Operation.invoke(
                SpaceOperation.AddObject,
                {
                  object,
                  target: options.target,
                },
                { spaceId: options.db.spaceId },
              );
            }),
        },
      ]),
    ];
  }),
);
