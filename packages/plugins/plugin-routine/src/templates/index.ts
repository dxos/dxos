//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { AppAnnotation } from '@dxos/app-toolkit';
import * as Instructions from '@dxos/compute/Instructions';
import * as Skill from '@dxos/compute/Skill';
import * as Trigger from '@dxos/compute/Trigger';
import { Obj, Ref, Type } from '@dxos/echo';

import { RoutineCapabilities } from '#types';

import { makeRoutine } from '../util';

/**
 * Blank template: an instructions-action routine draft with an empty trigger; the action kind, schedule, and
 * body are configured in the form. In an object companion the instructions are seeded with the subject (in
 * `objects`) and its type's skills so the draft starts associated with the subject; the global create dialog
 * (no subject) starts with bare instructions.
 */
export const blank: RoutineCapabilities.Template = {
  id: RoutineCapabilities.BlankTemplateId,
  label: 'Blank',
  icon: 'ph--lightning--regular',
  scaffold: ({ name, subject }) =>
    Effect.succeed(
      makeRoutine({
        name,
        instructions: Instructions.make({
          skills: subject ? skillRefsForObject(subject) : [],
          objects: subject ? [Ref.make(subject)] : undefined,
        }),
        trigger: Trigger.make({}),
      }),
    ),
};

/** Templates contributed by plugin-routine itself. */
export const defaultTemplates: RoutineCapabilities.Template[] = [blank];

/** Registry skill refs declared by the object type's {@link AppAnnotation.SkillsAnnotation}. */
const skillRefsForObject = (object: Obj.Unknown): Ref.Ref<Skill.Skill>[] => {
  const type = Obj.getType(object);
  if (!type) {
    return [];
  }
  const keys = Option.getOrElse(() => [] as string[])(AppAnnotation.SkillsAnnotation.get(Type.getSchema(type)));
  return keys.map((key) => Ref.fromURI(Skill.registryURI(key)));
};
