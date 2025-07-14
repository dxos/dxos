//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Blueprint, type BlueprintRegistry } from '@dxos/assistant';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type TagPickerOptions } from '@dxos/react-ui-tag-picker';

import { type ChatProcessor } from '../../hooks';

/**
 * Adapter.
 */
export const useBlueprintHandlers = (space?: Space, processor?: ChatProcessor, registry?: BlueprintRegistry) => {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const blueprintTags = useMemo(
    () => blueprints.map((blueprint) => ({ id: blueprint.id, label: blueprint.name })),
    [blueprints],
  );

  // TODO(burdon):
  useEffect(() => {
    if (!space) {
      return;
    }

    const resolver = space.db.graph.createRefResolver({
      context: {
        space: space.db.spaceId,
      },
    });

    const t = setTimeout(async () => {
      const blueprints: Blueprint[] = [];
      for (const ref of processor?.blueprints.bindings.value ?? []) {
        const obj = await resolver.resolve(ref.dxn);
        invariant(Obj.instanceOf(Blueprint, obj));
        if (obj) {
          blueprints.push(obj);
        }
      }

      setBlueprints(blueprints);
    });
    return () => clearTimeout(t);
  }, [space, processor, registry]);

  // Blueprints.
  const handleSearchBlueprints = useCallback<NonNullable<TagPickerOptions['onSearch']>>(
    (text, ids) => {
      return (
        registry
          ?.query()
          .filter(
            ({ key: blueprintId, name }) =>
              ids.indexOf(blueprintId) === -1 && name.toLowerCase().includes(text.toLowerCase()),
          )
          .map((blueprint) => ({ id: blueprint.key, label: blueprint.name })) ?? []
      );
    },
    [registry],
  );

  // Update conversation and aspace.
  const handleUpdateBlueprints = useCallback<NonNullable<TagPickerOptions['onUpdate']>>(
    async (ids) => {
      invariant(space);
      const { objects: current } = await space.db.query(Filter.type(Blueprint)).run();
      for (const id of ids) {
        const blueprint = registry?.query().find((blueprint) => blueprint.key === id);
        if (!blueprint) {
          continue;
        }

        let local = current?.find((blueprint) => blueprint.key === id);
        if (!local) {
          // TODO(dmaretskyi): We might need to `clone` the blueprint here, since the db.add returns the same object reference.
          local = space.db.add(blueprint);
        }

        processor?.blueprints.bind(Ref.make(local));
      }
    },
    [processor, registry, space],
  );

  return [blueprintTags, handleSearchBlueprints, handleUpdateBlueprints] as const;
};
