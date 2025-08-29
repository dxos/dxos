//
// Copyright 2025 DXOS.org
//

import { useSignalEffect } from '@preact/signals-react';
import { useCallback, useMemo, useState } from 'react';

import { Capabilities, useCapabilities } from '@dxos/app-framework';
import { type AiContextBinder } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj, Ref } from '@dxos/echo';
import { isNonNullable } from '@dxos/util';

/**
 * Provide a registry of blueprints from plugins.
 */
// TODO(burdon): Reconcile with eventual public registry.
export const useBlueprintRegistry = () => {
  const blueprints = useCapabilities(Capabilities.BlueprintDefinition);
  return useMemo(() => new Blueprint.Registry(blueprints.map((blueprint) => blueprint())), [blueprints]);
};

export const useBlueprints = ({ blueprintRegistry }: { blueprintRegistry?: Blueprint.Registry }) =>
  useMemo(() => blueprintRegistry?.query() ?? [], [blueprintRegistry]);

/**
 * Create reactive map of active blueprints (by key).
 */
export const useActiveBlueprints = ({ context }: { context?: AiContextBinder }) => {
  const [active, setActive] = useState<Map<string, Blueprint.Blueprint>>(new Map());

  useSignalEffect(() => {
    const refs = [...(context?.blueprints.value ?? [])];
    const blueprints = refs.map((ref) => ref.target).filter(isNonNullable);
    setActive(new Map(blueprints.map((blueprint) => [blueprint.key, blueprint])));
  });

  return active;
};

// TODO(burdon): Context should manage ephemeral state of bindings until prompt is issued?
export const useBlueprintHandlers = ({
  space,
  context,
  blueprintRegistry,
}: {
  space: Space;
  context?: AiContextBinder;
  blueprintRegistry?: Blueprint.Registry;
}) => {
  const onUpdateBlueprint = useCallback(
    async (key: string, checked: boolean) => {
      if (!context || !blueprintRegistry) {
        return;
      }

      // Find existing cloned blueprint.
      const { objects } = await space.db.query(Filter.type(Blueprint.Blueprint)).run();
      let storedBlueprint = objects.find((blueprint) => blueprint.key === key);
      if (checked) {
        if (!storedBlueprint) {
          const blueprint = blueprintRegistry.getByKey(key);
          if (!blueprint) {
            return;
          }
          // NOTE: Possible race condition with other peers.
          storedBlueprint = space.db.add(Obj.clone(blueprint));
        }
        await context.bind({ blueprints: [Ref.make(storedBlueprint)] });
      } else if (storedBlueprint) {
        await context.unbind({ blueprints: [Ref.make(storedBlueprint)] });
      }
    },
    [space, context, blueprintRegistry],
  );

  return { onUpdateBlueprint };
};
