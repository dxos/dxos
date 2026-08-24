//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Skill from '@dxos/compute/Skill';
import { Database, Filter, Obj, Ref, Registry } from '@dxos/echo';

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

        const type = Obj.getType(subject);
        const keys = type ? Skill.annotatedSkillKeys(type) : [];
        if (keys.length === 0) {
          return self;
        }

        // The registry wins: a key it serves binds by URI, and only the rest fall back to a space copy.
        const registrySkills = yield* Registry.runQuery(Filter.type(Skill.Skill));
        const registryKeys = keys.filter((key) => registrySkills.some((skill) => Obj.getMeta(skill).key === key));
        const spaceOnlyKeys = keys.filter((key) => !registryKeys.includes(key));
        const spaceSkills =
          spaceOnlyKeys.length > 0
            ? (yield* Database.query(Filter.type(Skill.Skill)).run).filter((skill) =>
                spaceOnlyKeys.includes(Obj.getMeta(skill).key ?? ''),
              )
            : [];

        return {
          ...self,
          skills: [
            ...(self.skills ?? []),
            ...registryKeys.map((key) => Ref.fromURI(Skill.registryURI(key))),
            ...spaceSkills.map((skill) => Ref.make(skill)),
          ],
        };
      }),
    });
  }),
);
