//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Instructions from '@dxos/compute/Instructions';
import * as Skill from '@dxos/compute/Skill';
import * as Trigger from '@dxos/compute/Trigger';
import { Ref } from '@dxos/echo';

import { RoutineCapabilities } from '#types';

import { makeRoutine } from '../util/index.ts';

/**
 * Blank template: an instructions-action routine draft with an empty trigger; the action kind, schedule, and
 * body are configured in the form.
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
          skills: subject ? Skill.annotatedSkillRefs(subject) : [],
          objects: subject ? [Ref.make(subject)] : undefined,
        }),
        trigger: Trigger.make({}),
      }),
    ),
};

/** Templates contributed by plugin-routine itself. */
export const defaultTemplates: RoutineCapabilities.Template[] = [blank];
