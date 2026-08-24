//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Skill from '@dxos/compute/Skill';
import { Database, Filter, Obj, Ref, Registry } from '@dxos/echo';

import { AssistantCapabilities } from '#types';

/**
 * The bindings every chat gets from its subject: the subject itself, plus the skills its type declares
 * via {@link Skill.SkillsAnnotation}. Type-specific providers add to this rather than replace it.
 */
const subjectContext: AssistantCapabilities.SubjectContext = {
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

    // Registry skills bind by key URI, since the ECHO ref resolver already spans the registry. A key
    // the registry does not serve may still exist as a fork in the space.
    const registrySkills = yield* Registry.runQuery(Filter.type(Skill.Skill));
    const registryKeys = keys.filter((key) => registrySkills.some((skill) => Obj.getMeta(skill).key === key));
    const forkKeys = keys.filter((key) => !registryKeys.includes(key));
    const forks =
      forkKeys.length > 0
        ? (yield* Database.query(Filter.type(Skill.Skill)).run).filter((skill) =>
            forkKeys.includes(Obj.getMeta(skill).key ?? ''),
          )
        : [];

    return {
      ...self,
      skills: [
        ...(self.skills ?? []),
        ...registryKeys.map((key) => Ref.fromURI(Skill.registryURI(key))),
        ...forks.map((skill) => Ref.make(skill)),
      ],
    };
  }),
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(AssistantCapabilities.SubjectContext, subjectContext);
  }),
);
