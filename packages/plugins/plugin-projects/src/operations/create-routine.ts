//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { ProjectSkill } from '@dxos/assistant-toolkit';
import type * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import * as Skill from '@dxos/compute/Skill';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import * as RoutineOperation from '@dxos/plugin-routine/RoutineOperation';

import { ProjectOperation } from '#types';

import { ARTIFACT_SKILL_KEYS } from '../skills/keys';

/**
 * Seeds project scope into a routine's owned instructions: `ProjectSkill` (so the headless run can
 * file its outputs into the project's artifacts) plus the artifact-type skills, deduped against
 * whatever the scaffold already added. The project itself reaches the session as a context object —
 * the blank template seeds `instructions.objects` from the creation subject. Together these give a
 * routine the same standing scope a project chat gets from `CreateChat`'s bindings; `RunInstructions`
 * binds `instructions.skills`/`instructions.objects` into the headless session.
 */
export const seedProjectScope = (instructions: Instructions.Instructions): void => {
  const skillRefs = [ProjectSkill.key, ...ARTIFACT_SKILL_KEYS].map((key) => Ref.fromURI(Skill.registryURI(key)));
  Obj.update(instructions, (instructions) => {
    const existing = new Set(instructions.skills.map((ref) => ref.uri.toString()));
    instructions.skills = [...instructions.skills, ...skillRefs.filter((ref) => !existing.has(ref.uri.toString()))];
  });
};

const handler: Operation.WithHandler<typeof ProjectOperation.CreateRoutine> = ProjectOperation.CreateRoutine.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ project }) {
      const { db } = yield* Database.Service;

      // Routed through plugin-routine's creation entrypoint so placement and trigger wiring stay in one
      // place; the blank template leaves the action and schedule to be configured in the routine form.
      // The project travels as the creation subject, so the scaffold seeds it into
      // `instructions.objects` — the routine's headless sessions then run in project scope.
      const { object, subject } = yield* Operation.invoke(RoutineOperation.CreateRoutine, {
        db,
        templateId: RoutineCapabilities.BlankTemplateId,
        subject: project,
      });
      invariant(Routine.instanceOf(object), 'Expected a Routine.');

      const instructionsRef = Routine.instructionsRef(object);
      if (instructionsRef) {
        seedProjectScope(yield* Database.load(instructionsRef));
      }

      // Owned AND linked, like template starter routines: the parent edge makes the routine (and its
      // owned trigger) cascade-delete with the project, while the ref keeps gallery order — the
      // Routines section lists by type query, so ownership does not hide it there.
      Obj.setParent(object, project);
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
