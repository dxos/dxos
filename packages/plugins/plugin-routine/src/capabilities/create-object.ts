//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Obj, Type } from '@dxos/echo';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { CreateRoutinePanel } from '#components';
import { Routine, RoutineCapabilities, RoutineOperation } from '#types';

type CreateOptions = Parameters<SpaceCapabilities.CreateObjectEntry['createObject']>[1];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Routine.Routine),
      customPanel: CreateRoutinePanel,
      createObject: ({ name, templateId }: { name?: string; templateId: string }, options: CreateOptions) =>
        Operation.invoke(RoutineOperation.CreateRoutine, { db: options.db, templateId, name }).pipe(
          // Mark the new routine so its article opens in an edit session (a freshly-scaffolded routine needs
          // configuration before it is useful); the article clears the flag when the session ends.
          Effect.tap((result) =>
            Capabilities.updateAtomValue(RoutineCapabilities.State, (state) => ({
              ...state,
              editing: { ...state.editing, [Obj.getURI(result.object)]: true },
            })),
          ),
        ),
    });
  }),
);
