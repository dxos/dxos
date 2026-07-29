//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation, Routine } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { RoutineCapabilities, RoutineOperation } from '@dxos/plugin-routine';

import { ProjectOperation } from '#types';

const handler: Operation.WithHandler<typeof ProjectOperation.CreateRoutine> = ProjectOperation.CreateRoutine.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ project }) {
      const { db } = yield* Database.Service;

      // Routed through plugin-routine's creation entrypoint so placement and trigger wiring stay in one
      // place; the blank template leaves the action and schedule to be configured in the routine form.
      const { object, subject } = yield* Operation.invoke(RoutineOperation.CreateRoutine, {
        db,
        templateId: RoutineCapabilities.BlankTemplateId,
      });
      invariant(Routine.instanceOf(object), 'Expected a Routine.');

      // A link, not ownership: the routine is a space object (it appears under Routines and may be
      // triggered independently), and the project records that it was created in its scope.
      Obj.update(project, (project) => {
        project.routines = [...project.routines, Ref.make(object)];
      });

      yield* Database.flush();
      yield* Operation.invoke(LayoutOperation.Open, { subject: [...subject] });
      return { routine: object };
    }),
  ),
);

export default handler;
