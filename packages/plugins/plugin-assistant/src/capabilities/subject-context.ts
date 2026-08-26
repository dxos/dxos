//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Skill from '@dxos/compute/Skill';
import { Obj, Ref } from '@dxos/echo';

import { AssistantCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    /** Type-specific providers add to these bindings, never replace them. */
    return Capability.contribute(AssistantCapabilities.SubjectContext, {
      getBindings: Effect.fnUntraced(function* ({ subject }) {
        // A skill subject binds as a skill, so the session carries its instructions and tools.
        const self: AssistantCapabilities.SubjectBindings = Obj.instanceOf(Skill.Skill, subject)
          ? { skills: [Ref.make(subject)] }
          : { objects: [Ref.make(subject)] };

        const annotated = yield* Skill.resolveAnnotatedSkills(subject);
        return { ...self, skills: [...(self.skills ?? []), ...annotated] };
      }),
    });
  }),
);
