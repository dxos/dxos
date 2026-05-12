//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation, Script } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { ScriptOperation } from '#types';
import { Notebook } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Script.Script.typename,
        inputSchema: ScriptOperation.ScriptProps,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const { object } = yield* Operation.invoke(ScriptOperation.CreateScript, props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Notebook.Notebook.typename,
        inputSchema: ScriptOperation.NotebookProps,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Notebook.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
    ];
  }),
);
