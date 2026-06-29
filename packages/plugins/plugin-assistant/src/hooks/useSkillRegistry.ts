//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import { type AiContext } from '@dxos/assistant';
import { Skill } from '@dxos/compute';
import { type Database, Filter, Obj, Ref, type Registry } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { distinctBy } from '@dxos/util';

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
    const skills = distinctBy([...registrySkills, ...spaceSkills], (b) => Obj.getMeta(b).key);
    skills.sort(({ name: a }, { name: b }) => a.localeCompare(b));
    return skills;
  }, [registrySkills, spaceSkills]);
};

/**
 * Create reactive map of active skills (by key).
 */
export const useActiveSkills = ({ context }: { context?: AiContext.Binder }) => {
  const [active, setActive] = useState<Map<string, Skill.Skill>>(new Map());

  useEffect(() => {
    if (!context) {
      setActive(new Map());
      return;
    }

    const updateActive = () => {
      const skills = context.getSkills();
      setActive(
        new Map(
          skills
            .map((skill) => [Obj.getMeta(skill).key, skill] as const)
            .filter((entry): entry is readonly [string, Skill.Skill] => entry[0] !== undefined),
        ),
      );
    };

    // Set initial value.
    updateActive();

    // Subscribe to changes.
    return context.subscribeSkills(updateActive);
  }, [context]);

  return active;
};

// TODO(burdon): Move logic into binder.
export const useSkillHandlers = ({
  db,
  context,
  registry,
}: {
  db: Database.Database;
  context?: AiContext.Binder;
  registry?: Registry.Registry;
}) => {
  const onUpdateSkill = useCallback(
    async (key: string, checked: boolean) => {
      if (!context) {
        return;
      }

      if (checked) {
        // Check if the skill is in the registry — if so, bind via its key URI directly
        // (no DB clone needed). Fall back to an existing DB copy for user-forked skills.
        const registrySkill = registry
          ?.query(Filter.type(Skill.Skill))
          .runSync()
          .find((b) => Obj.getMeta(b).key === key);

        if (registrySkill) {
          await context.bind({ skills: [Ref.fromURI(Skill.registryURI(key))] });
        } else {
          // User-forked skill (in DB but not in registry): bind via DB ref.
          const objects = await db.query(Filter.type(Skill.Skill)).run();
          const storedSkill = objects.find((skill) => Obj.getMeta(skill).key === key);
          if (storedSkill) {
            await context.bind({ skills: [Ref.make(storedSkill)] });
          }
        }
      } else {
        // Unbind: try registry ref first, then DB ref.
        const registrySkill = registry
          ?.query(Filter.type(Skill.Skill))
          .runSync()
          .find((b) => Obj.getMeta(b).key === key);
        if (registrySkill) {
          await context.unbind({ skills: [Ref.fromURI(Skill.registryURI(key))] });
        } else {
          const objects = await db.query(Filter.type(Skill.Skill)).run();
          const storedSkill = objects.find((skill) => Obj.getMeta(skill).key === key);
          if (storedSkill) {
            await context.unbind({ skills: [Ref.make(storedSkill)] });
          }
        }
      }
    },
    [db, context, registry],
  );

  return { onUpdateSkill };
};
