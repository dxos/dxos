//
// Copyright 2025 DXOS.org
//

import { useSignalEffect } from '@preact/signals-react';
import { useCallback, useMemo, useState } from 'react';

import { Common } from '@dxos/app-framework';
import { useCapabilities } from '@dxos/app-framework/react';
import { type AiContextBinder } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { distinctBy } from '@dxos/util';

/**
 * Provide a registry of blueprints from plugins.
 */
// TODO(burdon): Reconcile with eventual public registry.
export const useBlueprintRegistry = () => {
  const blueprints = useCapabilities(Common.Capability.BlueprintDefinition);
  return useMemo(() => new Blueprint.Registry(blueprints), [blueprints]);
};

export const useBlueprints = ({
  blueprintRegistry,
  db,
}: {
  blueprintRegistry?: Blueprint.Registry;
  db?: Database.Database;
}) => {
  const staticBlueprints = useMemo(() => blueprintRegistry?.query() ?? [], [blueprintRegistry]);
  const spaceBlueprints = useQuery(db, Filter.type(Blueprint.Blueprint));
  return useMemo(() => {
    const blueprints = distinctBy([...staticBlueprints, ...spaceBlueprints], (b) => b.key);
    blueprints.sort(({ name: a }, { name: b }) => a.localeCompare(b));
    return blueprints;
  }, [staticBlueprints, spaceBlueprints]);
};

/**
 * Create reactive map of active blueprints (by key).
 */
export const useActiveBlueprints = ({ context }: { context?: AiContextBinder }) => {
  const [active, setActive] = useState<Map<string, Blueprint.Blueprint>>(new Map());

  useSignalEffect(() => {
    const blueprints = context?.blueprints.value ?? [];
    setActive(new Map(blueprints.map((blueprint) => [blueprint.key, blueprint])));
  });

  return active;
};

// TODO(burdon): Move logic into binder.
export const useBlueprintHandlers = ({
  db,
  context,
  blueprintRegistry,
}: {
  db: Database.Database;
  context?: AiContextBinder;
  blueprintRegistry?: Blueprint.Registry;
}) => {
  const onUpdateBlueprint = useCallback(
    async (key: string, checked: boolean) => {
      if (!context || !blueprintRegistry) {
        return;
      }

      // Find existing cloned blueprint.
      const objects = await db.query(Filter.type(Blueprint.Blueprint)).run();
      let storedBlueprint = objects.find((blueprint) => blueprint.key === key);
      if (checked) {
        if (!storedBlueprint) {
          const blueprint = blueprintRegistry.getByKey(key);
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
    [db, context, blueprintRegistry],
  );

  return { onUpdateBlueprint };
};
