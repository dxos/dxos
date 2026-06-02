//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import { type AiContext } from '@dxos/assistant';
import { Blueprint } from '@dxos/compute';
import { type Database, Entity, Filter, Obj, Ref, type Registry } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { distinctBy } from '@dxos/util';

export const useBlueprints = ({
  registry,
  db,
}: {
  registry?: Registry.Registry;
  db?: Database.Database;
}) => {
  const [registryBlueprints, setRegistryBlueprints] = useState<Blueprint.Blueprint[]>(() =>
    registry?.query(Filter.type(Blueprint.Blueprint)).runSync() ?? [],
  );

  useEffect(() => {
    if (!registry) {
      setRegistryBlueprints([]);
      return;
    }
    setRegistryBlueprints(registry.query(Filter.type(Blueprint.Blueprint)).runSync());
    return registry.changed.on(() => {
      setRegistryBlueprints(registry.query(Filter.type(Blueprint.Blueprint)).runSync());
    });
  }, [registry]);

  const spaceBlueprints = useQuery(db, Filter.type(Blueprint.Blueprint));
  return useMemo(() => {
    const blueprints = distinctBy([...registryBlueprints, ...spaceBlueprints], (b) => Obj.getMeta(b).key);
    blueprints.sort(({ name: a }, { name: b }) => a.localeCompare(b));
    return blueprints;
  }, [registryBlueprints, spaceBlueprints]);
};

/**
 * Create reactive map of active blueprints (by key).
 */
export const useActiveBlueprints = ({ context }: { context?: AiContext.Binder }) => {
  const [active, setActive] = useState<Map<string, Blueprint.Blueprint>>(new Map());

  useEffect(() => {
    if (!context) {
      setActive(new Map());
      return;
    }

    const updateActive = () => {
      const blueprints = context.getBlueprints();
      setActive(
        new Map(
          blueprints
            .map((blueprint) => [Obj.getMeta(blueprint).key, blueprint] as const)
            .filter((entry): entry is readonly [string, Blueprint.Blueprint] => entry[0] !== undefined),
        ),
      );
    };

    // Set initial value.
    updateActive();

    // Subscribe to changes.
    return context.subscribeBlueprints(updateActive);
  }, [context]);

  return active;
};

// TODO(burdon): Move logic into binder.
export const useBlueprintHandlers = ({
  db,
  context,
  registry,
}: {
  db: Database.Database;
  context?: AiContext.Binder;
  registry?: Registry.Registry;
}) => {
  const onUpdateBlueprint = useCallback(
    async (key: string, checked: boolean) => {
      if (!context || !registry) {
        return;
      }

      // Find existing cloned blueprint.
      const objects = await db.query(Filter.type(Blueprint.Blueprint)).run();
      let storedBlueprint = objects.find((blueprint) => Obj.getMeta(blueprint).key === key);
      if (checked) {
        if (!storedBlueprint) {
          const blueprint = registry.list().find((e) => Entity.getMeta(e)?.key === key) as Blueprint.Blueprint | undefined;
          if (!blueprint) {
            return;
          }

          // NOTE: Possible race condition with other peers.
          storedBlueprint = db.add(Obj.clone(blueprint));
        }
        await context.bind({ blueprints: [Ref.make(storedBlueprint)] });
      } else if (storedBlueprint) {
        await context.unbind({ blueprints: [Ref.make(storedBlueprint)] });
      }
    },
    [db, context, registry],
  );

  return { onUpdateBlueprint };
};
