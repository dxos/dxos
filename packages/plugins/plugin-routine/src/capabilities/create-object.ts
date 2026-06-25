//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { CreateRoutinePanel } from '#components';
import { Routine, RoutineOperation } from '#types';

type CreateOptions = Parameters<SpaceCapabilities.CreateObjectEntry['createObject']>[1];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Routine.Routine),
      customPanel: CreateRoutinePanel,
      // A freshly-created routine starts disabled, so its article opens editable (editability is derived from
      // the enabled state); no extra edit-mode flag is needed.
      createObject: ({ name, templateId }: { name?: string; templateId: string }, options: CreateOptions) =>
        Operation.invoke(RoutineOperation.CreateRoutine, { db: options.db, templateId, name }),
    });
  }),
);
