//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-react';
import { Array, Effect, Option, pipe } from 'effect';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Capabilities, useCapabilities } from '@dxos/app-framework';
import { type AiContextBinder } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useQuery } from '@dxos/react-client/echo';
import { isNonNullable } from '@dxos/util';

export type UpdateCallback = (key: string, active: boolean) => void;

/**
 * Provide a registry of blueprints from plugins.
 */
// TODO(burdon): Reconcile with public registry.
export const useBlueprintRegistry = () => {
  const blueprints = useCapabilities(Capabilities.BlueprintDefinition);
  return useMemo(() => new Blueprint.Registry(blueprints), [blueprints]);
};

/**
 * Get collection of active blueprints based on the context.
 */
export const useBlueprints = (
  space: Space,
  context: AiContextBinder,
  blueprintRegistry?: Blueprint.Registry,
): { blueprints: Blueprint.Blueprint[]; active: string[]; update: UpdateCallback } => {
  const spaceBlueprints = useQuery(space, Filter.type(Blueprint.Blueprint));
  const [blueprints, setBlueprints] = useState<Blueprint.Blueprint[]>([]);
  const [active, setActive] = useState<string[]>([]);

  useEffect(() => {
    const existing = new Set(spaceBlueprints.map((blueprint) => blueprint.key));
    const registry = blueprintRegistry?.query().filter((blueprint) => !existing.has(blueprint.key));
    setBlueprints([...(registry ?? []), ...spaceBlueprints].toSorted((a, b) => a.key.localeCompare(b.key)));

    return effect(() => {
      const refs = [...(context.blueprints.value ?? [])];
      const t = setTimeout(async () => {
        const blueprints = (await Ref.Array.loadAll(refs)).filter(isNonNullable);
        setActive(blueprints.map((blueprint) => blueprint.key));
      });
      return () => clearTimeout(t);
    });
  }, [context, blueprintRegistry, spaceBlueprints]);

  const handleUpdate = useCallback<UpdateCallback>(
    (key: string, isActive: boolean) =>
      Effect.gen(function* () {
        log('update', { key, isActive });
        const spaceBlueprint = Array.findFirst(spaceBlueprints, (blueprint) => blueprint.key === key);
        yield* Option.match(spaceBlueprint, {
          onNone: () =>
            pipe(
              Option.fromNullable(blueprintRegistry),
              Option.flatMap((registry) => Option.fromNullable(registry.getByKey(key))),
              // TODO(dmaretskyi): This should be done by Obj.clone.
              Option.map(({ id: _id, ...data }) => space.db.add(Obj.make(Blueprint.Blueprint, data))),
              Option.map((obj) => Effect.tryPromise(() => context.bind({ blueprints: [Ref.make(obj)] }))),
              Option.getOrElse(() => Effect.succeed(undefined)),
            ),
          onSome: (blueprint) => {
            const method = isActive ? 'bind' : 'unbind';
            return Effect.tryPromise(() => context[method]({ blueprints: [Ref.make(blueprint)] }));
          },
        });
      }).pipe(Effect.runPromise),
    [space, context, active, blueprintRegistry],
  );

  return { blueprints, active, update: handleUpdate };
};
