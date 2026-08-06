//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

import { CreateRoutinePanel } from '#components';

import * as RoutineOperation from '../types/RoutineOperation';

type CreateOptions = Parameters<SpaceCapabilities.CreateObjectEntry['createObject']>[1];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Routine.Routine),
      customPanel: CreateRoutinePanel,
      createObject: ({ name, templateId }: { name?: string; templateId: string }, options: CreateOptions) =>
        Operation.invoke(RoutineOperation.CreateRoutine, { db: options.db, templateId, name }),
    });
  }),
);
