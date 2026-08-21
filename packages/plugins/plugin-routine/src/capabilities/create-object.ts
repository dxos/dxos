//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { CreateRoutinePanel } from '#components';
import { RoutineOperation } from '#types';

type CreateOptions = Parameters<SpaceCapabilities.CreateObjectEntry['createObject']>[1];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Routine.Routine),
      customPanel: CreateRoutinePanel,
      // The custom panel scaffolds and edits the routine before Save, so it submits a ready draft — that
      // only needs filing. Without one (no custom panel, e.g. the sidebar) the template does the work.
      createObject: (
        { name, templateId, draft }: { name?: string; templateId: string; draft?: Routine.Routine },
        options: CreateOptions,
      ) =>
        draft
          ? Operation.invoke(SpaceOperation.AddObject, { object: draft }, { spaceId: options.db.spaceId })
          : Operation.invoke(RoutineOperation.CreateRoutine, { db: options.db, templateId, name }),
    });
  }),
);
