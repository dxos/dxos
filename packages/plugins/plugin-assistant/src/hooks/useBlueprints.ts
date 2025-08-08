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

export type UseBlueprints = {
  blueprints: Blueprint.Blueprint[];
  active: string[];
  onUpdate: UpdateCallback;
};

/**
 * Get collection of active blueprints based on the context.
 */
export const useBlueprints = (
  space: Space,
  binder: AiContextBinder,
  blueprintRegistry?: Blueprint.Registry,
): UseBlueprints => {
  const spaceBlueprints = useQuery(space, Filter.type(Blueprint.Blueprint));
  const [blueprints, setBlueprints] = useState<Blueprint.Blueprint[]>([]);
  const [active, setActive] = useState<string[]>([]);

  useEffect(() => {
    const existing = new Set(spaceBlueprints.map((blueprint) => blueprint.key));
    const registry = blueprintRegistry?.query().filter((blueprint) => !existing.has(blueprint.key));
    setBlueprints([...(registry ?? []), ...spaceBlueprints].toSorted((a, b) => a.key.localeCompare(b.key)));

    return effect(() => {
      const refs = [...(binder.blueprints.value ?? [])];
      const t = setTimeout(async () => {
        const blueprints = (await Ref.Array.loadAll(refs)).filter(isNonNullable);
        setActive(blueprints.map((blueprint) => blueprint.key));
      });
      return () => clearTimeout(t);
    });
  }, [binder, blueprintRegistry, spaceBlueprints]);

  const handleUpdate = useCallback<UpdateCallback>(
    (key: string, isActive: boolean) =>
      Effect.gen(function* () {
        log('update', { key, isActive });
        const blueprint = Array.findFirst(spaceBlueprints, (blueprint) => blueprint.key === key);
        yield* Option.match(blueprint, {
          onNone: () =>
            pipe(
              Option.fromNullable(blueprintRegistry),
              Option.flatMap((registry) => Option.fromNullable(registry.getByKey(key))),
              Option.map((blueprint) => space.db.add(Obj.clone(blueprint))),
              Option.map((obj) => Effect.tryPromise(() => binder.bind({ blueprints: [Ref.make(obj)] }))),
              Option.getOrElse(() => Effect.succeed(undefined)),
            ),
          onSome: (blueprint) => {
            const method = isActive ? 'bind' : 'unbind';
            return Effect.tryPromise(() => binder[method]({ blueprints: [Ref.make(blueprint)] }));
          },
        });
      }).pipe(Effect.runPromise),
    [space, binder, active, blueprintRegistry],
  );

  return { blueprints, active, onUpdate: handleUpdate };
};
