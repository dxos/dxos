//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Blueprint } from '@dxos/assistant';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type TagPickerOptions } from '@dxos/react-ui-tag-picker';

import { type ChatProcessor } from '../../hooks';

/**
 * Adapter.
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
      for (const ref of processor?.blueprints ?? []) {
        const obj = await resolver.resolve(ref.dxn);
        invariant(Obj.instanceOf(Blueprint, obj));
        if (obj) {
          blueprints.push(obj);
        }
      }

      setBlueprints(blueprints);
    });
    return () => clearTimeout(t);
  }, [space, processor]);

  // Blueprints.
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

  // Update conversation and aspace.
  const handleUpdateBlueprints = useCallback<NonNullable<TagPickerOptions['onUpdate']>>(
    async (ids) => {
      invariant(space);
      invariant(processor);
      const stored = space.db.query(Filter.type(Blueprint));
      for (const id of ids) {
        const blueprint = processor.blueprintRegistry?.query().find((blueprint) => blueprint.key === id);
        if (!blueprint) {
          continue;
        }

        await processor.conversation.blueprints.bind(Ref.make(blueprint));
        if (!stored.objects.some((obj) => obj.key === blueprint.key)) {
          space.db.add(Obj.make(Blueprint, { ...blueprint }));
        }
      }
    },
    [processor, space],
  );

  return [blueprintTags, handleSearchBlueprints, handleUpdateBlueprints] as const;
};
