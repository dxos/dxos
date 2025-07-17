//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Blueprint } from '@dxos/assistant';
import { type Space } from '@dxos/client/echo';
import { Filter, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type TagPickerOptions } from '@dxos/react-ui-tag-picker';

import { type ChatProcessor } from '../../hooks';

/**
 * Adapter for selecting and updating blueprints for the current processor and conversation.
 */
export const useBlueprintHandlers = (space?: Space, processor?: ChatProcessor) => {
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
      // for (const ref of processor?.context.blueprints.value ?? []) {
      //   const obj = await resolver.resolve(ref.dxn);
      //   invariant(Obj.instanceOf(Blueprint, obj));
      //   if (obj) {
      //     blueprints.push(obj);
      //   }
      // }

      setBlueprints(blueprints);
    });
    return () => clearTimeout(t);
  }, [space, processor]);

  const handleSearchBlueprints = useCallback<NonNullable<TagPickerOptions['onSearch']>>(
    (text, ids) => {
      return (
        processor?.blueprintRegistry
          ?.query()
          .filter(
            ({ key: blueprintId, name }) =>
              ids.indexOf(blueprintId) === -1 && name.toLowerCase().includes(text.toLowerCase()),
          )
          .map((blueprint) => ({ id: blueprint.key, label: blueprint.name })) ?? []
      );
    },
    [processor],
  );

  const handleUpdateBlueprints = useCallback<NonNullable<TagPickerOptions['onUpdate']>>(
    async (ids) => {
      invariant(space);
      invariant(processor);
      const { objects: current } = await space.db.query(Filter.type(Blueprint)).run();
      for (const id of ids) {
        const blueprint = processor.blueprintRegistry?.query().find((blueprint) => blueprint.key === id);
        if (!blueprint) {
          continue;
        }

        let local = current?.find((blueprint) => blueprint.key === id);
        if (!local) {
          // TODO(dmaretskyi): We might need to `clone` the blueprint here, since the db.add returns the same object reference.
          local = space.db.add(blueprint);
        }

        await processor.context.bind({ blueprints: [Ref.make(local)] });
      }
    },
    [processor, space],
  );

  return [blueprintTags, handleSearchBlueprints, handleUpdateBlueprints] as const;
};
