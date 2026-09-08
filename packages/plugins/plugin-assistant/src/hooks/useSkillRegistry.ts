//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import { type AiContext } from '@dxos/assistant';
import * as Skill from '@dxos/compute/Skill';
import { type Database, Filter, Obj, Ref, type Registry } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { distinctBy } from '@dxos/util';

/**
 * Stable identity for a skill in the picker.
 *
 * A registry skill is identified by its key, but a skill the user authored in a space has no
 * registry entry and so no key; falling back to its URI keeps such skills distinct from each other
 * (a shared `undefined` key collapses them into one row) and addressable by the toggle handler.
 */
export const getSkillId = (skill: Skill.Skill): string => Obj.getMeta(skill).key ?? Obj.getURI(skill) ?? skill.id;

export const useSkills = ({ registry, db }: { registry?: Registry.Registry; db?: Database.Database }) => {
  const [registrySkills, setRegistrySkills] = useState<Skill.Skill[]>(
    () => registry?.query(Filter.type(Skill.Skill)).runSync() ?? [],
  );

  useEffect(() => {
    if (!registry) {
      setRegistrySkills([]);
      return;
    }
    setRegistrySkills(registry.query(Filter.type(Skill.Skill)).runSync());
    return registry.changed.on(() => {
      setRegistrySkills(registry.query(Filter.type(Skill.Skill)).runSync());
    });
  }, [registry]);

  const spaceSkills = useQuery(db, Filter.type(Skill.Skill));
  return useMemo(() => {
    // Space copies first, so a fork shadows the registry entry it was cloned from rather than the
    // other way round — it carries the user's edits (same precedence as `Skill.resolveAnnotatedSkills`).
    const skills = distinctBy([...spaceSkills, ...registrySkills], getSkillId);
    skills.sort(({ name: a }, { name: b }) => a.localeCompare(b));
    return skills;
  }, [registrySkills, spaceSkills]);
};

/**
 * Create reactive map of active skills (by skill id).
 */
export const useActiveSkills = ({ context }: { context?: AiContext.Binder }) => {
  const [active, setActive] = useState<Map<string, Skill.Skill>>(new Map());

  useEffect(() => {
    if (!context) {
      setActive(new Map());
      return;
    }

    const updateActive = () => {
      setActive(new Map(context.getSkills().map((skill) => [getSkillId(skill), skill] as const)));
    };

    // Set initial value.
    updateActive();

    // Subscribe to changes.
    return context.subscribeSkills(updateActive);
  }, [context]);

  return active;
};

// TODO(burdon): Move logic into binder.
export const useSkillHandlers = ({ context }: { context?: AiContext.Binder }) => {
  const onUpdateSkill = useCallback(
    async (skill: Skill.Skill, checked: boolean) => {
      if (!context) {
        return;
      }

      // A registry skill binds by its key URI, which resolves through the hypergraph registry — no
      // DB clone needed. Anything else is a space object (including a fork of a registry skill) and
      // binds by its own ref, so the user's edits are what the conversation sees.
      const key = Obj.getMeta(skill).key;
      const registryRef = key !== undefined ? Ref.fromURI(Skill.registryURI(key)) : undefined;
      const ref = Obj.getDatabase(skill) === undefined && registryRef ? registryRef : Ref.make(skill);

      log('update skill', { skill: getSkillId(skill), uri: ref.uri, checked });
      if (checked) {
        await context.bind({ skills: [ref] });
      } else {
        // Both forms: a fork and the registry entry it shadows share one row, and the toggle has to
        // clear the conversation whichever of the two was bound (e.g. by the chat's own context).
        const refs = registryRef && registryRef.uri !== ref.uri ? [ref, registryRef] : [ref];
        await context.unbind({ skills: refs });
      }
    },
    [context],
  );

  return { onUpdateSkill };
};
